#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotRoot = path.join(repoRoot, 'supabase/current-state-schema');
const manifestPath = path.join(snapshotRoot, 'manifest.json');
const partsRoot = path.join(snapshotRoot, 'parts');
const generatedRoot = path.join(snapshotRoot, 'generated');

function fail(message) {
  console.error(`[current-state-schema] ${message}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const partFiles = (await readdir(partsRoot))
  .filter((name) => /^part-\d{2}\.b64$/.test(name))
  .sort();

if (partFiles.length !== manifest.transport.partCount) {
  fail(`expected ${manifest.transport.partCount} transport parts, found ${partFiles.length}`);
}

const transportBase64 = (
  await Promise.all(partFiles.map((name) => readFile(path.join(partsRoot, name), 'utf8')))
).join('').replace(/\s+/g, '');

if (!/^[A-Za-z0-9+/]+={0,2}$/.test(transportBase64)) {
  fail('transport contains non-base64 characters');
}

await mkdir(generatedRoot, { recursive: true });
const envelopePath = path.join(generatedRoot, 'current-state-schema.pgp');
const plaintextPath = path.join(repoRoot, manifest.plaintext.path);
await writeFile(envelopePath, Buffer.from(transportBase64, 'base64'), { mode: 0o600 });

const gpg = spawnSync(
  'gpg',
  [
    '--batch',
    '--yes',
    '--pinentry-mode',
    'loopback',
    '--passphrase',
    manifest.transport.passphrase,
    '--output',
    plaintextPath,
    '--decrypt',
    envelopePath,
  ],
  { cwd: repoRoot, encoding: 'utf8' },
);

await rm(envelopePath, { force: true });

if (gpg.status !== 0) {
  fail(`gpg materialization failed: ${(gpg.stderr || gpg.stdout || '').trim()}`);
}

const sql = await readFile(plaintextPath);
const sha256 = createHash('sha256').update(sql).digest('hex');
if (sql.byteLength !== manifest.plaintext.bytes) {
  fail(`plaintext byte count mismatch: expected ${manifest.plaintext.bytes}, got ${sql.byteLength}`);
}
if (sha256 !== manifest.plaintext.sha256) {
  fail(`plaintext sha256 mismatch: expected ${manifest.plaintext.sha256}, got ${sha256}`);
}

const text = sql.toString('utf8');
const forbidden = [
  { label: 'INSERT statements', pattern: /^\s*INSERT\s+INTO\b/im },
  { label: 'COPY statements', pattern: /^\s*COPY\b/im },
  { label: 'sequence values', pattern: /\b(?:pg_catalog\.)?setval\s*\(/i },
  { label: 'ownership statements', pattern: /\bOWNER\s+TO\b/i },
  { label: 'large objects', pattern: /\b(?:lo_create|lo_import|pg_largeobject)\b/i },
  { label: 'managed auth/storage rows', pattern: /^\s*(?:INSERT|COPY)\s+(?:INTO\s+)?(?:auth|storage)\./im },
  { label: 'Postgres connection strings', pattern: /postgres(?:ql)?:\/\//i },
  { label: 'JWT-like tokens', pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/ },
  { label: 'Supabase service keys', pattern: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i },
];

for (const check of forbidden) {
  if (check.pattern.test(text)) fail(`forbidden content detected: ${check.label}`);
}

for (const required of ['CREATE TABLE', 'CREATE POLICY', 'ROW LEVEL SECURITY']) {
  if (!text.includes(required)) fail(`required schema evidence missing: ${required}`);
}

console.log(`[current-state-schema] materialized ${path.relative(repoRoot, plaintextPath)}`);
console.log(`[current-state-schema] bytes=${sql.byteLength} sha256=${sha256}`);
