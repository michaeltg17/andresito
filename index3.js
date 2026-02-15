const { exec } = require('child_process');
const path = require('path');

exec('npx stryker run', {
  cwd: path.join(__dirname, 'app')
});
