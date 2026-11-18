#!/usr/bin/env node

import { createWorkspace } from 'create-nx-workspace';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function main() {
  const name = process.argv[2];
  if (!name) {
    throw new Error('Please provide a name for the workspace');
  }

  console.log(`Creating the workspace: ${name}`);

  const presetVersion = require('../../package.json').version;

  const { directory } = await createWorkspace(
    `@devhub/mern-plugin@${presetVersion}`,
    {
      name,
      nxCloud: 'skip',
      packageManager: 'pnpm',
    }
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

void main().catch((error: unknown) => {
  console.error('Failed to create the workspace:', error);
  process.exitCode = 1;
});
