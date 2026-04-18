/**
 * Builds a prompt for the LLM with test and source code for mutation generation
 */
export function buildPrompt(testCode: string, sourceCode: string): string {
  return `
Test file:
${testCode}

Source file:
${sourceCode}

Generate mutations of the source code that should break the tests.
Code must compile.
Each mutation should be a small change.
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
`;
}