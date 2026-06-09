import { readdir, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'src/server.js',
  'src/aiProvider.js',
  'src/aiResponse.js',
  'src/classifier.js',
  'src/evaluator.js',
  'src/todoRules.js',
  'src/postgresLogStore.js',
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'db/schema.sql',
  '.env.example',
  'Makefile',
  'requirements.md',
  'harness/scripts/run_harness_cycle.ps1'
];

for (const file of requiredFiles) {
  await stat(file);
}

async function jsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await jsFiles(path));
    if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const file of await jsFiles('src')) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf-8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}
for (const file of await jsFiles('public')) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf-8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

const html = await readFile('public/index.html', 'utf-8');
for (const marker of ['Playground', 'Test Cases', 'Evaluation Logs', 'Schema Rules']) {
  if (!html.includes(marker)) throw new Error(`missing UI marker: ${marker}`);
}
console.log('project_validation: pass');
