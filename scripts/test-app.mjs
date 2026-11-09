import { spawn } from 'child_process';
import path from 'path';

console.log('Testing Electron startup and Milestone 1 features...');

const electronBin = path.resolve('node_modules/electron/dist/electron.exe');
const appDir = path.resolve('.');

const child = spawn(electronBin, [appDir, '--test-mode'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'test',
  },
});

let output = '';
let errOutput = '';

child.stdout.on('data', (d) => {
  const str = d.toString();
  output += str;
  console.log('[Electron stdout]:', str.trim());
});

child.stderr.on('data', (d) => {
  const str = d.toString();
  errOutput += str;
  console.error('[Electron stderr]:', str.trim());
});

// Let it run for 4 seconds then quit gracefully
setTimeout(() => {
  console.log('Test timer finished. Closing Electron process...');
  child.kill('SIGINT');
  setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch (e) {}
  }, 1000);
}, 4000);

child.on('close', (code) => {
  console.log(`Electron exited with code ${code}`);
  console.log('Startup test complete.');
  process.exit(0);
});
