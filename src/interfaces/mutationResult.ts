export interface MutationResult {
  id: number;
  description?: string;
  mutationCode: string;
  testResult: "passed" | "failed";
  timestamp: Date;
  diff?: {
    deleted: string[];
    added: string[];
  };
}