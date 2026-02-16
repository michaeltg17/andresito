const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const appPath = path.join(__dirname, 'app');

function runStryker() {
  return new Promise((resolve, reject) => {
    const child = exec('npx stryker run', { cwd: appPath });

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Stryker exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

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
Your task is to check the provided mutants and create or modify the provided tests to kill them.
You can also delete/combine/refactor tests for improvements.
Return only the whole test file.

STRICT RULES:
- Do NOT use markdown.
- Do NOT use triple backticks.
- Do NOT include \`\`\`.
- Do NOT explain anything.
- Output must start directly with code.
- Output must end directly with code.

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

function rewriteTestFile(newTestCode) {
  fs.writeFileSync(
    path.join(appPath, 'src/calculator.test.js'),
    newTestCode,
    'utf8'
  );
}

function runTests() {
  return new Promise((resolve) => {
    const child = exec('npm test --silent', { cwd: appPath });

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

async function run() {
  await runStryker();

  const { report, source, test } = loadData();
  const mutants = extractMutants(report);

  if (mutants.length === 0) {
    console.log('No surviving mutants.');
    return false; // tell main to stop
  }

  console.log(`${mutants.length} mutants survived. Sending to LLM...`);

  const prompt = buildPrompt(mutants, source, test);
  const result = await sendToLLM(prompt);

  rewriteTestFile(result);
  console.log('Tests updated.');

  return true; // tell main to continue
}


async function main() {
  for (let i = 1; i <= 3; i++) {
    console.log(`\n===== ITERATION ${i} =====\n`);

    const shouldContinue = await run();

    if (!shouldContinue) {
      console.log('Stopping loop.');
      break;
    }
  }

  console.log('\nProcess finished.');
}

main().catch(console.error);
