import fs from "fs";
import { execSync } from "child_process";

const filePath = "app/src/calculator.js";
const sourceCode = fs.readFileSync(filePath, "utf-8");

// 🔥 Limit context (VERY important for GGUF)
const limitedSource = sourceCode.split("\n").slice(0, 200).join("\n");

const prompt = `
You are performing mutation testing.

Change EXACTLY ONE line in the code to break its tests.

RULES:
- Modify only ONE existing line
- Do NOT add or remove lines
- Do NOT explain anything
- Output ONLY in this format:

LINE: <number>
CODE: <new line>

Code:
${limitedSource}
`;

interface LlamaRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

interface LlamaResponse {
  choices?: Array<{
    delta?: { content?: string };
    text?: string;
    message?: { content?: string };
  }>;
}

async function callLlamaStream(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let fullText = "";

  try {
    const res = await fetch("http://localhost:8080/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "Qwen3.5-27B-UD-Q4_K_XL.gguf",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 200,
        stream: true,
      } as LlamaRequest),
    });

    if (!res.body) throw new Error("No body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    console.log("📡 Streaming response:\n");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // 🔍 DEBUG: see raw chunks (llama.cpp can be weird)
      // console.log("\n🧩 RAW CHUNK:\n", chunk);

      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();

        if (data === "[DONE]") break;

        try {
          const json = JSON.parse(data) as LlamaResponse;

          // 🔥 Support ALL llama.cpp variants
          const token =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.text ??
            json.choices?.[0]?.message?.content ??
            "";

          if (token) {
            process.stdout.write(token);
            fullText += token;
          }
        } catch {
          // ignore broken partial JSON
        }
      }
    }

    clearTimeout(timeout);

    if (!fullText.trim()) {
      throw new Error("Empty stream");
    }

    return fullText;
  } catch (err) {
    console.log("\n⚠️ Streaming failed, falling back...\n");
    clearTimeout(timeout);
    return await callLlamaOnce();
  }
}

// ✅ Non-stream fallback (VERY important)
async function callLlamaOnce(): Promise<string> {
  const res = await fetch("http://localhost:8080/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Qwen3.5-27B-UD-Q4_K_XL.gguf",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
      stream: false,
    } as LlamaRequest),
  });

  const data = await res.json() as LlamaResponse;

  return (
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.text ||
    ""
  );
}

interface MutationResult {
  lineNumber: number;
  newLine: string;
}

function parseMutation(text: string): MutationResult {
  const lineMatch = text.match(/LINE:\s*(\d+)/i);
  const codeMatch = text.match(/CODE:\s*([^\n]+)/i);

  if (!lineMatch || !codeMatch) {
    throw new Error("Failed to parse:\n" + text);
  }

  return {
    lineNumber: Number(lineMatch[1]),
    newLine: codeMatch[1],
  };
}

function applyMutation(lineNumber: number, newLine: string): void {
  const lines = sourceCode.split("\n");

  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error("Invalid line number");
  }

  console.log("\n🔍 Diff:");
  console.log(`- ${lines[lineNumber - 1]}`);
  console.log(`+ ${newLine}`);

  lines[lineNumber - 1] = newLine;

  fs.writeFileSync(filePath, lines.join("\n"));
}

function runTests(): boolean {
  console.log("\n🧪 Running tests...\n");

  try {
    execSync("npm test", {
      cwd: "app",
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("📖 Loaded source file");

  const output = await callLlamaStream();

  console.log("\n\n🧠 Final output:\n", output);

  const { lineNumber, newLine } = parseMutation(output);

  console.log(`\n✏️ Applying mutation at line ${lineNumber}`);
  console.log(`➡️ ${newLine}`);

  applyMutation(lineNumber, newLine);

  const passed = runTests();

  console.log(
    passed
      ? "\n❌ Test is weak (mutation survived)"
      : "\n✅ Test caught the mutation"
  );
}

main().catch((e: Error) => {
  console.error("\n💥 Fatal:", e.message);
  process.exit(1);
});