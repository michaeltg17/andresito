import fs from "fs";

import {
  MutationResult,
} from "./interfaces";
import { runMutation } from "./services/mutationRunner";
import { callLlamaStream } from "./services/llamaService";
import { buildPrompt } from "./services/promptBuilder";
import { parseMutations } from "./services/mutationParser";

const testCode = fs.readFileSync("app/src/calculator.test.js", "utf-8");
const sourceCode = fs.readFileSync("app/src/calculator.js", "utf-8");

// Array to store all mutations
const mutations: MutationResult[] = [];

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

async function main(): Promise<void> {
  console.log("📖 Loaded source file");

  const prompt = buildPrompt(testCode, sourceCode);
  const output = await callLlamaStream(prompt);

  console.log("\n\n🧠 Parsing mutations from LLM response...\n");

  const llmMutations = parseMutations(output);
  console.log(`📥 Found ${llmMutations.length} mutations from LLM\n`);

  if (llmMutations.length === 0) {
    console.log("⚠️ No mutations found, exiting");
    return;
  }

  // Process each mutation using the mutationRunner service
  for (let i = 0; i < llmMutations.length; i++) {
    const llmMutation = llmMutations[i];
    const mutationNum = i + 1;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧬 Mutation #${mutationNum}: ${llmMutation.description || "No description"}`);
    console.log("=".repeat(50));

    // Use the mutationRunner service to run the mutation
    const mutation = runMutation(llmMutation);
    
    // Save to our tracking array
    mutations.push(mutation);
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

  console.log("\n✅ All mutations processed. Original source file is intact.");
}

main().catch((e: Error) => {
  console.error("\n💥 Fatal:", e.message);
  process.exit(1);
});