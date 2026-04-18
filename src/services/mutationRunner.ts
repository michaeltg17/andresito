import fs from "fs";
import { execSync } from "child_process";

import { MutationResult, LLMMutation } from "../interfaces/index";

const filePath = "app/src/calculator.js";
const originalSourceCode = fs.readFileSync(filePath, "utf-8");
let sourceCode = originalSourceCode;

// Mutation ID counter
let mutationIdCounter = 0;

// Helper function to restore original source code
function restoreOriginalSource(): void {
  fs.writeFileSync(filePath, originalSourceCode);
  sourceCode = originalSourceCode;
  console.log("🔄 Restored original source file");
}

// Helper function to generate next mutation ID
function getNextMutationId(): number {
  return ++mutationIdCounter;
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
  return mutation;
}

/**
 * Runs a single mutation: applies it to the file, runs tests, and returns the result.
 * The original source is restored after running the mutation.
 */
export function runMutation(llmMutation: LLMMutation): MutationResult {
  const diff = applyFullSource(llmMutation.code);
  const passed = runTests();
  const mutation = saveMutation(llmMutation.code, passed, llmMutation.description, diff);
  
  console.log(
    passed
      ? "❌ Test is weak (mutation survived)"
      : "✅ Test caught the mutation"
  );

  // Restore original source after running the mutation
  restoreOriginalSource();

  return mutation;
}