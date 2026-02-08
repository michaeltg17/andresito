const https = require('https');
const http = require('http');
const { URL } = require('url');

const OLLAMA_URL = 'http://192.168.1.100:11434';
const MODEL_NAME = 'qwen3-coder:30b';

function sendPrompt(prompt) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${OLLAMA_URL}/api/generate`);
    
    const postData = JSON.stringify({
      model: MODEL_NAME,
      prompt: prompt,
      stream: false
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Response:', response.response);
          resolve(response.response);
        } catch (error) {
          reject(new Error('Failed to parse response: ' + error.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Example usage
const examplePrompt = "Explain quantum computing in simple terms";
sendPrompt(examplePrompt)
  .then(response => console.log('Completed successfully'))
  .catch(error => console.error('Failed to get response:', error.message));

module.exports = { sendPrompt };