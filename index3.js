const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const appPath = path.join(__dirname, 'app');
const logFilePath = path.join(__dirname, 'run.txt');
const MAX_ITERATIONS = 3;
let previousMutantIds = null;

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

  for (const [filePath, file] of Object.entries(report.files || {})) {
    for (const mutant of file.mutants || []) {
      if (
        mutant.status === 'Survived' ||
        mutant.status === 'Timeout' ||
        mutant.status === 'NoCoverage'
      ) {
        const id = [
          filePath,
          mutant.location?.start?.line,
          mutant.location?.start?.column,
          mutant.replacement
        ].join(':');

        mutants.push({
          id,
          filePath,
          status: mutant.status,
          replacement: mutant.replacement,
          location: mutant.location
        });
      }
    }
  }

  return mutants;
}

function areSameMutants(prevIds, currentMutants) {
  if (!prevIds) return false;

  const currentIds = currentMutants.map(m => m.id).sort();
  const prevSorted = [...prevIds].sort();

  if (currentIds.length !== prevSorted.length) return false;

  return currentIds.every((id, index) => id === prevSorted[index]);
}

function buildPrompt(mutants, source, test) {
  return `
You are a mutation testing code generator.

You must respond with VALID JSON ONLY.

Format:
{
  "testFile": "<FULL JAVASCRIPT TEST FILE CONTENT>"
}

Hard Rules:
- Output must be valid JSON.
- No markdown.
- No explanations.
- No comments outside testFile.
- No extra keys.
- No text before or after JSON.
- testFile must contain only raw JavaScript.

If you violate these rules, the response will be rejected.

--- SURVIVED MUTANTS ---
${JSON.stringify(mutants)}

--- SOURCE CODE ---
${source}

--- CURRENT TESTS ---
${test}
`;
}

function parseLLMResponse(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed.testFile) throw new Error('Missing testFile');
    return parsed.testFile;
  } catch (err) {
    throw new Error('Invalid LLM JSON output');
  }
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
  return parseLLMResponse(data.response);
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

  if (areSameMutants(previousMutantIds, mutants)) {
    log('Same surviving mutants as previous iteration. Likely equivalent mutants.');
    return false;
  }

  log(`${mutants.length} mutants survived. Sending to LLM...`);

  const prompt = buildPrompt(mutants, source, test);
  const result = await sendToLLM(prompt);

  const cleaned = cleanLLMOutput(result);
  rewriteTestFile(cleaned);
  previousMutantIds = mutants.map(m => m.id);

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
