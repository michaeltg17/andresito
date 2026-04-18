import { LLMMutation, LLMResponse } from "../interfaces";

// Parse LLM response to extract mutations
export function parseMutations(text: string): LLMMutation[] {
  const trimmedText = text.trim();
  
  // Try to extract JSON from markdown code blocks first
  const jsonBlockMatch = trimmedText.match(/```(?:json)?\n([\s\S]*?)\n```/);
  const jsonContent = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmedText;
  
  try {
    const data = JSON.parse(jsonContent) as LLMResponse;
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
      const data = JSON.parse(jsonMatch[0]) as LLMResponse;
      if (data.mutations && Array.isArray(data.mutations)) {
        return data.mutations.filter(m => m.code && m.code.trim());
      }
    } catch (e) {
      console.log("⚠️ Fallback parsing also failed");
    }
  }
  
  throw new Error("Could not parse mutations from LLM response");
}