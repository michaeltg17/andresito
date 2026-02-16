const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const appPath = path.join(__dirname, 'app');
const logFilePath = path.join(__dirname, 'run.txt');
const MAX_ITERATIONS = 3;

/* =========================
   LOGGER
========================= */

function log(message) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${message}`;
  console.log(formatted);
  fs.appendFileSync(logFilePath, formatted + '\n', 'utf8');
}

/* =========================
   EXEC WITH LOGGING
========================= */

function execWithLogging(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { cwd });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      fs.appendFileSync(logFilePath, data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      fs.appendFileSync(logFilePath, data);
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

/* =========================
   CORE OPERATIONS
========================= */

function runStryker() {
  return execWithLogging('npx stryker run', appPath);
}

function runTests() {
  return execWithLogging('npm test --silent', appPath)
    .then(() => true)
    .catch(() => false);
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
      if (mutant.status === 'Survived' || mutant.status === 'Timeout' || mutant.status === 'NoCoverage') {
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
- Do NOT explain anything.
- Output must be raw JavaScript.

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-coder:30b',
      prompt,
      stream: false
    })
  });

  const data = await response.json();
  return data.response;
}

function cleanLLMOutput(text) {
  return text
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .trim();
}

function rewriteTestFile(newTestCode) {
  fs.writeFileSync(
    path.join(appPath, 'src/calculator.test.js'),
    newTestCode,
    'utf8'
  );
}

/* =========================
   SINGLE ITERATION
========================= */

async function runIteration() {
  log('Running tests...');

  // const testsPass = await runTests();

  // if (!testsPass) {
  //   log('Tests failed. Stopping iteration.');
  //   return false;
  // }

  log('Running Stryker...');
  await runStryker();

  const { report, source, test } = loadData();
  const mutants = extractMutants(report);

  if (mutants.length === 0) {
    log('No surviving mutants.');
    return false;
  }

  log(`${mutants.length} mutants survived. Sending to LLM...`);

  const prompt = buildPrompt(mutants, source, test);
  const result = await sendToLLM(prompt);

  const cleaned = cleanLLMOutput(result);
  rewriteTestFile(cleaned);

  log('Tests updated.');

  return true;
}

/* =========================
   MAIN LOOP
========================= */

async function main() {
  fs.writeFileSync(logFilePath, '', 'utf8');
  log('Starting mutation improvement process.');

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    log(`===== ITERATION ${i} =====`);

    const shouldContinue = await runIteration();

    if (!shouldContinue) {
      log('Stopping loop.');
      break;
    }
  }

  log('Process finished.');
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
});
