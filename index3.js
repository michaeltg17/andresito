const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Run stryker inside app to generate json
const appPath = path.join(__dirname, 'app');
exec('npx stryker run', {
  cwd: path.join(__dirname, 'app')
});

function loadData() {
  const report = JSON.parse(
    fs.readFileSync(
      path.join(appPath, 'reports/mutation/mutation.json'),
      'utf8'
    )
  );

  const source = fs.readFileSync(
    path.join(appPath, 'src/calculator.js'),
    'utf8'
  );

  const test = fs.readFileSync(
    path.join(appPath, 'src/calculator.test.js'),
    'utf8'
  );

  return { report, source, test };
}

function extractMutants(report) {
  const mutants = [];

  for (const file of Object.values(report.files || {})) {
    for (const mutant of file.mutants || []) {
      if (mutant.status === 'Survived' || mutant.status === 'Timeout') {
        mutants.push({
          status: mutant.status,
          replacement: mutant.replacement,
          location: mutant.location
        });
      }
    }
  }

  return mutants;
}

function buildPrompt(mutants, source, test) {
  return `
You are a mutation testing expert.
Your task is to check the provided mutants and create or modify the provided tests to kill them.
You can also delete tests if there is duplication or whatever.

Return ONLY valid JSON in this exact format:

{
  "calculator.js": "full updated source code",
  "calculator.test.js": "full updated test code"
}

Rules:
- Output must be valid JSON.
- No explanations.
- No markdown.
- No backticks.
- Always return complete files.

--- SURVIVED MUTANTS ---
${JSON.stringify(mutants, null, 2)}

--- SOURCE CODE ---
${source}

--- CURRENT TESTS ---
${test}
`;
}

async function sendToLLM(prompt) {
  const response = await fetch('http://192.168.1.100:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen3-coder:30b',
      prompt: prompt,
      stream: false
    })
  });

  const data = await response.json();
  return data.response;
}

function rewriteFiles(llmResponse) {
  const appPath = path.join(__dirname, 'app');

  let parsed;

  try {
    parsed = JSON.parse(llmResponse);
  } catch (err) {
    console.error('LLM did not return valid JSON');
    return;
  }

  if (parsed['calculator.js']) {
    fs.writeFileSync(
      path.join(appPath, 'src/calculator.js'),
      parsed['calculator.js'],
      'utf8'
    );
  }

  if (parsed['calculator.test.js']) {
    fs.writeFileSync(
      path.join(appPath, 'src/calculator.test.js'),
      parsed['calculator.test.js'],
      'utf8'
    );
  }

  console.log('Files updated successfully.');
}

async function main() {
  const { report, source, test } = loadData();
  const mutants = extractMutants(report);
  const prompt = buildPrompt(mutants, source, test);

  const result = await sendToLLM(prompt);

  rewriteFiles(result);
}

main();
