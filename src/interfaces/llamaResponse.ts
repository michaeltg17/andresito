export interface LlamaResponse {
  choices?: Array<{
    delta?: { content?: string; reasoning_content?: string };
    text?: string;
    message?: { content?: string; reasoning_content?: string };
    finish_reason?: string;
  }>;
}