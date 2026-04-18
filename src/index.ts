import fs from "fs";
import { execSync } from "child_process";

import {
  MutationResult,
  LLMMutation,
  LLMResponseData,
  LlamaRequest,
  LlamaResponse,
} from "./interfaces";

const filePath = "app/src/calculator.js";
const originalSourceCode = fs.readFileSync(filePath, "utf-8"); // Store original for restoration
let sourceCode = originalSourceCode; // Use this as current state
const testCode = fs.readFileSync("app/src/calculator.test.js", "utf-8");

// Helper function to restore original source code
function restoreOriginalSource(): void {
  fs.writeFileSync(filePath, originalSourceCode);
  sourceCode = originalSourceCode;
  console.log("🔄 Restored original source file");
}

// Array to store all mutations
const mutations: MutationResult[] = [];

// Mutation ID counter
let mutationIdCounter = 0;

// Helper function to generate next mutation ID
function getNextMutationId(): number {
  return ++mutationIdCounter;
}

// Helper function to save mutation to array
function saveMutation(
  mutationCode: string,
  testPassed: boolean,
  description?: string,
  diff?: { deleted: string[]; added: string[] }
): MutationResult {
  const mutation: MutationResult = {
    id: getNextMutationId(),
    description,
    mutationCode,
    testResult: testPassed ? "passed" : "failed",
    timestamp: new Date(),
    diff,
  };
  mutations.push(mutation);
  return mutation;
}

// Helper function to get all mutations
function getAllMutations(): MutationResult[] {
  return mutations;
}

// Helper function to get mutation statistics
function getMutationStats(): {
  total: number;
  passed: number;
  failed: number;
  survivalRate: number;
} {
  const total = mutations.length;
  const passed = mutations.filter((m) => m.testResult === "passed").length;
  const failed = mutations.filter((m) => m.testResult === "failed").length;
  const survivalRate = total > 0 ? (passed / total) * 100 : 0;

  return { total, passed, failed, survivalRate };
}

// Helper function to export mutations to JSON file
function exportMutations(filename: string = "mutations.json"): void {
  const exportData = mutations.map((m) => ({
    ...m,
    timestamp: m.timestamp.toISOString(),
  }));
  fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log(`📁 Exported ${mutations.length} mutations to ${filename}`);
}

const prompt = `
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

// Parse LLM response to extract mutations
function parseMutations(text: string): LLMMutation[] {
  const trimmedText = text.trim();
  
  // Try to extract JSON from markdown code blocks first
  const jsonBlockMatch = trimmedText.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const jsonContent = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmedText;
  
  try {
    const data = JSON.parse(jsonContent) as LLMResponseData;
    if (data.mutations && Array.isArray(data.mutations)) {
      return data.mutations.filter(m => m.code && m.code.trim());
    }
  } catch (e) {
    console.log("⚠️ Failed to parse JSON, trying fallback...");
  }
  
  // Fallback: try to find JSON anywhere in the text
  const jsonMatch = trimmedText.match(/\{[\s\S]*"mutations"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[0]) as LLMResponseData;
      if (data.mutations && Array.isArray(data.mutations)) {
        return data.mutations.filter(m => m.code && m.code.trim());
      }
    } catch (e) {
      console.log("⚠️ Fallback parsing also failed");
    }
  }
  
  throw new Error("Could not parse mutations from LLM response");
}

async function callLlamaStream(): Promise<string> {
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

function applyFullSource(newSource: string): { deleted: string[]; added: string[] } {
  const oldLines = sourceCode.split("\n");
  const newLines = newSource.split("\n");

  console.log("\n🔍 Changes:");
  
  const deleted: string[] = [];
  const added: string[] = [];
  
  // Show a diff-like comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] ?? "<deleted>";
    const newLine = newLines[i] ?? "<added>";
    
    if (oldLine !== newLine) {
      if (oldLine !== "<deleted>") {
        console.log(`- ${oldLine}`);
        deleted.push(oldLine);
      }
      if (newLine !== "<added>") {
        console.log(`+ ${newLine}`);
        added.push(newLine);
      }
    }
  }

  fs.writeFileSync(filePath, newSource);
  
  return { deleted, added };
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

  console.log("\n\n🧠 Parsing mutations from LLM response...\n");

  const llmMutations = parseMutations(output);
  console.log(`📥 Found ${llmMutations.length} mutations from LLM\n`);

  if (llmMutations.length === 0) {
    console.log("⚠️ No mutations found, exiting");
    return;
  }

  // Process each mutation
  for (let i = 0; i < llmMutations.length; i++) {
    const llmMutation = llmMutations[i];
    const mutationNum = i + 1;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧬 Mutation #${mutationNum}: ${llmMutation.description || "No description"}`);
    console.log("=".repeat(50));

    const diff = applyFullSource(llmMutation.code);

    const passed = runTests();

    // Save mutation to array
    const mutation = saveMutation(llmMutation.code, passed, llmMutation.description, diff);

    console.log(
      passed
        ? "❌ Test is weak (mutation survived)"
        : "✅ Test caught the mutation"
    );

    // Restore original source before next mutation
    restoreOriginalSource();
  }

  // Print final statistics
  console.log(`\n${"=".repeat(50)}`);
  console.log("📈 Final Mutation Statistics:");
  console.log("=".repeat(50));
  const stats = getMutationStats();
  console.log(`   Total mutations: ${stats.total}`);
  console.log(`   Survived (passed): ${stats.passed}`);
  console.log(`   Killed (failed): ${stats.failed}`);
  console.log(`   Survival rate: ${stats.survivalRate.toFixed(1)}%`);

  // Export mutations to JSON
  exportMutations();

  console.log("\n✅ All mutations processed. Original source file is intact.");
}

main().catch((e: Error) => {
  console.error("\n💥 Fatal:", e.message);
  process.exit(1);
});