import { spawn } from 'node:child_process';

const app = process.argv[2];

const commands = {
  api: ['nx', 'serve', 'api'],
  web: ['nx', 'dev', 'web', '--', '--port', '4200'],
};

if (!app || !commands[app]) {
  console.error('Usage: pnpm start <api|web>');
  process.exit(1);
}

const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(executable, commands[app], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
