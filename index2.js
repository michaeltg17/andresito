const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TARGET_FILE = path.join(__dirname, 'app', 'sum.js')

async function mutateWithLLM(originalCode) {
  const prompt = `
You are performing mutation testing.
Change the implementation so that it is logically incorrect.
For example, if it adds numbers, make it subtract instead.
Return ONLY the full modified file content.
  
${originalCode}
`

  const response = await fetch('http://192.168.1.100:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-coder:30b',
      prompt,
      stream: false
    })
  })

  const data = await response.json()
  return data.response
}

async function run() {
  const originalCode = fs.readFileSync(TARGET_FILE, 'utf-8')

  const mutatedCode = await mutateWithLLM(originalCode)

  fs.writeFileSync(TARGET_FILE, mutatedCode)

  let testsFailed = false

  try {
    execSync('npm test', {
      cwd: path.join(__dirname, 'app'),
      stdio: 'inherit'
    })
  } catch (err) {
    testsFailed = true
  }

  fs.writeFileSync(TARGET_FILE, originalCode)

  if (testsFailed) {
    console.log('Tests failed as expected ✅')
  } else {
    console.log('Tests did NOT fail ❌ — your tests may be weak')
  }
}

run()
