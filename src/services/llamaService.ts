import { LlamaRequest, LlamaResponse } from "../interfaces";

export const sourceCode = `// Calculator source code will be loaded at runtime`;

export let prompt = "";

/**
 * Sets the source and test code for the LLM prompt
 */
export function setPrompt(testCode: string, sourceCode: string): void {
  prompt = `
Test file:
${testCode}

Source file:
${sourceCode}

Generate multiple mutations of the source code that should break the tests.
Return ONLY a valid JSON object with this exact structure:
{
  "mutations": [
    {
      "description": "brief description of this mutation",
      "code": "full mutated source code here"
    },
    ... more mutations
  ]
}

Code must compile.
Each mutation should be a small change that might break tests.
`;
}

/**
 * Makes a streaming request to the Llama API
 */
export async function callLlamaStream(): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500000);

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

      for (const line of lines) {
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

/**
 * Makes a non-streaming request to the Llama API (fallback)
 */
export async function callLlamaOnce(): Promise<string> {
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