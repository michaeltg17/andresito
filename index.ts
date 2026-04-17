import fs from "fs";
import { execSync } from "child_process";

const filePath = "app/src/calculator.js";
const sourceCode = fs.readFileSync(filePath, "utf-8");
const testCode = fs.readFileSync("app/src/calculator.test.js", "utf-8");

const prompt = `
Test file:
${testCode}

Source file:
${sourceCode}

Mutate the source code in a small way that should break the test.
Return ONLY the full modified source file, nothing else, no markdown.
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
    delta?: { content?: string; reasoning_content?: string };
    text?: string;
    message?: { content?: string; reasoning_content?: string };
  }>;
}

async function callLlamaStream(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let fullText = "";
  let reasoningText = "";

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
        max_tokens: 2048,
        stream: true,
      } as LlamaRequest),
    });

    console.log(`📡 Response status: ${res.status} ${res.statusText}`);

    if (!res.body) throw new Error("No body in response");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    console.log("📡 Streaming response (reasoning):\n");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for ( const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();

        if (data === "[DONE]") break;

        try {
          const json = JSON.parse(data) as LlamaResponse;

          // 🔥 For reasoning models, separate reasoning_content from content
          const reasoningToken =
            json.choices?.[0]?.delta?.reasoning_content ??
            json.choices?.[0]?.message?.reasoning_content ??
            "";

          const contentToken =
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.message?.content ??
            json.choices?.[0]?.text ??
            "";

          if (reasoningToken) {
            process.stdout.write(reasoningToken);
            reasoningText += reasoningToken;
          }

          if (contentToken) {
            process.stdout.write(contentToken);
            fullText += contentToken;
          }
        } catch {
          // ignore broken partial JSON
        }
      }
    }

    clearTimeout(timeout);

    // For reasoning models, the actual answer is in content, not reasoning_content
    if (fullText.trim()) {
      return fullText;
    }

    // Fallback: if no content, return reasoning (some models use this differently)
    if (reasoningText.trim()) {
      console.log("\n⚠️ No content field, using reasoning as fallback");
      return reasoningText;
    }

    throw new Error("Empty stream");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`\n⚠️ Streaming failed: ${errorMsg}, falling back...\n`);
    clearTimeout(timeout);
    return await callLlamaOnce();
  }
}

// ✅ Non-stream fallback (VERY important)
async function callLlamaOnce(): Promise<string> {
  console.log("🔄 Attempting non-streaming request...\n");
  
  const res = await fetch("http://localhost:8080/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Qwen3.5-27B-UD-Q4_K_XL.gguf",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1024,
      stream: false,
    } as LlamaRequest),
  });

  console.log(`📡 Non-stream response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const errorText = await res.text();
    console.log(`❌ Error response body: ${errorText}`);
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json() as LlamaResponse;
  
  console.log("📥 Raw response data:", JSON.stringify(data, null, 2));

  // 🔥 For reasoning models: prefer content over reasoning_content
  const content =
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.text ||
    "";
  
  const reasoningContent = data.choices?.[0]?.message?.reasoning_content || "";

  if (!content || !content.trim()) {
    console.log("⚠️ Warning: Empty content from non-streaming response");
    console.log("🔍 Checking finish_reason:", data.choices?.[0]?.finish_reason);
    if (reasoningContent) {
      console.log("🔍 Using reasoning_content as fallback (length:", reasoningContent.length, ")");
      return reasoningContent;
    }
  }
  
  return content;
}

function parseFullSource(text: string): string {
  const trimmedText = text.trim();
  
  if (!trimmedText) {
    throw new Error("Empty response from LLM");
  }

  // Try to extract code from markdown code blocks first
  const codeBlockMatch = trimmedText.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // If no markdown block, use the entire response as the source code
  return trimmedText;
}

function applyFullSource(newSource: string): void {
  const oldLines = sourceCode.split("\n");
  const newLines = newSource.split("\n");

  console.log("\n🔍 Changes:");
  
  // Show a diff-like comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] ?? "<deleted>";
    const newLine = newLines[i] ?? "<added>";
    
    if (oldLine !== newLine) {
      if (oldLine !== "<deleted>") {
        console.log(`- ${oldLine}`);
      }
      if (newLine !== "<added>") {
        console.log(`+ ${newLine}`);
      }
    }
  }

  fs.writeFileSync(filePath, newSource);
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

  const newSource = parseFullSource(output);

  console.log("\n✏️ Applying full source mutation");

  applyFullSource(newSource);

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