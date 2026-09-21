#!/usr/bin/env node
/**
 * XtremeCRM Unified Runner (Ponytail: Node.js stdlib only, zero extra deps)
 * Usage:
 *   node dev.js         -> starts both dev servers (backend & frontend)
 *   node dev.js dev     -> starts both dev servers
 *   node dev.js build   -> builds both backend & frontend
 *   node dev.js start   -> runs production servers
 */

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2] || 'dev';

// ANSI Color Helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const prefixes = {
  backend: `${colors.cyan}${colors.bold}[backend]${colors.reset} `,
  frontend: `${colors.magenta}${colors.bold}[frontend]${colors.reset} `,
  system: `${colors.green}${colors.bold}[system]${colors.reset} `,
};

function formatLine(prefix, line) {
  return `${prefix}${line}`;
}

function pipeOutput(stream, prefix) {
  if (!stream) return;
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    console.log(formatLine(prefix, line));
  });
}

function runProcess(cmd, args, cwd, prefix) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  pipeOutput(child.stdout, prefix);
  pipeOutput(child.stderr, prefix);

  return child;
}

function runSequential(tasks) {
  return tasks.reduce((promise, task) => {
    return promise.then(() => {
      console.log(`${prefixes.system}Running: ${task.name}...`);
      return new Promise((resolve, reject) => {
        const child = spawn(task.cmd, task.args, {
          cwd: task.cwd,
          stdio: 'inherit',
          shell: false,
        });
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`${prefixes.system}✓ ${task.name} completed successfully\n`);
            resolve();
          } else {
            console.error(`${prefixes.system}${colors.red}✗ ${task.name} failed with exit code ${code}${colors.reset}`);
            reject(new Error(`Task failed: ${task.name}`));
          }
        });
      });
    });
  }, Promise.resolve());
}

const activeChildren = [];

function killAll() {
  if (activeChildren.length === 0) return;
  console.log(`\n${prefixes.system}Shutting down processes gracefully...`);
  for (const child of activeChildren) {
    try {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    } catch {
      // Ignore
    }
  }
}

process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  killAll();
  process.exit(0);
});

process.on('exit', () => {
  killAll();
});

async function main() {
  const backendDir = path.join(__dirname, 'backend');
  const frontendDir = path.join(__dirname, 'frontend');

  if (command === 'dev') {
    console.log(`${prefixes.system}Starting XtremeCRM Development Services...`);
    console.log(`${prefixes.system}Backend Target:  ${colors.cyan}http://localhost:3000${colors.reset}`);
    console.log(`${prefixes.system}Frontend Target: ${colors.magenta}http://localhost:5173${colors.reset}\n`);

    const backendProc = runProcess('pnpm', ['run', 'dev'], backendDir, prefixes.backend);
    activeChildren.push(backendProc);

    const frontendProc = runProcess('pnpm', ['run', 'dev'], frontendDir, prefixes.frontend);
    activeChildren.push(frontendProc);

    backendProc.on('exit', (code) => {
      console.log(`${prefixes.backend}Process exited with code ${code}`);
    });

    frontendProc.on('exit', (code) => {
      console.log(`${prefixes.frontend}Process exited with code ${code}`);
    });
  } else if (command === 'build') {
    console.log(`${prefixes.system}Starting XtremeCRM Production Build...\n`);
    try {
      await runSequential([
        { name: 'Backend Build (Prisma + TSC)', cmd: 'pnpm', args: ['run', 'build'], cwd: backendDir },
        { name: 'Frontend Build (ESLint + Vite)', cmd: 'pnpm', args: ['run', 'build'], cwd: frontendDir },
      ]);
      console.log(`${prefixes.system}${colors.green}${colors.bold}All builds finished successfully!${colors.reset}`);
    } catch {
      process.exit(1);
    }
  } else if (command === 'start') {
    console.log(`${prefixes.system}Starting XtremeCRM Production Services...`);
    console.log(`${prefixes.system}Backend:  ${colors.cyan}http://localhost:3000${colors.reset}`);
    console.log(`${prefixes.system}Frontend: ${colors.magenta}http://localhost:5173 (preview)${colors.reset}\n`);

    const backendProc = runProcess('pnpm', ['run', 'start'], backendDir, prefixes.backend);
    activeChildren.push(backendProc);

    const frontendProc = runProcess('pnpm', ['run', 'preview'], frontendDir, prefixes.frontend);
    activeChildren.push(frontendProc);
  } else {
    console.error(`${prefixes.system}Unknown command: ${command}`);
    console.log(`Usage: node dev.js [dev|build|start]`);
    process.exit(1);
  }
}

main();
