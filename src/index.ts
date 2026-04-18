import fs from "fs";
import { MutationResult } from "./interfaces";
import { runMutation } from "./services/mutationRunner";
import { callLlamaStream } from "./services/llamaService";
import { buildPrompt } from "./services/promptBuilder";
import { parseMutations } from "./services/mutationParser";
import { logFinalStats } from "./services/resultLogger";

async function main(): Promise<void> {
  const testCode = fs.readFileSync("app/src/calculator.test.js", "utf-8");
  const sourceCode = fs.readFileSync("app/src/calculator.js", "utf-8");
  console.log("📖 Loaded app files");

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
  const mutations: MutationResult[] = [];
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
  logFinalStats(mutations);
}

main().catch((e: Error) => {
  console.error("\n💥 Fatal:", e.message);
  process.exit(1);
});