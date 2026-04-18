import { MutationResult } from "../interfaces";

/**
 * Calculates mutation statistics from the results array
 */
export function getMutationStats(mutations: MutationResult[]): {
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

/**
 * Logs final mutation statistics to the console
 */
export function logFinalStats(mutations: MutationResult[]): void {
  const stats = getMutationStats(mutations);
  
  console.log(`\n${"=".repeat(50)}`);
  console.log("📈 Final Mutation Statistics:");
  console.log("=".repeat(50));
  console.log(`   Total mutations: ${stats.total}`);
  console.log(`   Survived (passed): ${stats.passed}`);
  console.log(`   Killed (failed): ${stats.failed}`);
  console.log(`   Survival rate: ${stats.survivalRate.toFixed(1)}%`);
  console.log("\n✅ All mutations processed. Original source file is intact.");
}