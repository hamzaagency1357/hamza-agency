#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotRoot = path.join(repoRoot, 'supabase/current-state-schema');
const manifest = JSON.parse(await readFile(path.join(snapshotRoot, 'manifest.json'), 'utf8'));
const partsRoot = path.join(snapshotRoot, 'parts');
const generatedRoot = path.join(snapshotRoot, 'generated');
const databaseUrl = process.env.CURRENT_STATE_SCHEMA_DATABASE_URL;

function fail(message) {
  console.error(`[current-state-schema] ${message}`);
  process.exit(1);
}

if (!databaseUrl) fail('CURRENT_STATE_SCHEMA_DATABASE_URL is required and must point to an isolated local PostgreSQL database');
let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  fail('CURRENT_STATE_SCHEMA_DATABASE_URL is not a valid URL');
}
if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) fail('refusing non-PostgreSQL connection');
if (!['127.0.0.1', 'localhost', '::1'].includes(parsedDatabaseUrl.hostname)) fail('refusing non-local PostgreSQL connection');

const partFiles = (await readdir(partsRoot)).filter((name) => /^part-\d{2}\.b64$/.test(name)).sort();
if (partFiles.length !== manifest.transport.partCount) {
  fail(`expected ${manifest.transport.partCount} transport parts, found ${partFiles.length}`);
}

const transportBase64 = (await Promise.all(partFiles.map((name) => readFile(path.join(partsRoot, name), 'utf8'))))
  .join('')
  .replace(/\s+/g, '');
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(transportBase64)) fail('transport contains non-base64 characters');

const escapedTransport = transportBase64.replaceAll("'", "''");
const escapedPassphrase = manifest.transport.passphrase.replaceAll("'", "''");
const query = `
\\set ON_ERROR_STOP on
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT encode(convert_to(pgp_sym_decrypt(decode('${escapedTransport}', 'base64'), '${escapedPassphrase}'), 'UTF8'), 'base64');
`;
const psql = spawnSync('psql', [databaseUrl, '--no-psqlrc', '--tuples-only', '--no-align', '--quiet'], {
  cwd: repoRoot,
  encoding: 'utf8',
  input: query,
  maxBuffer: 2 * 1024 * 1024,
});
if (psql.status !== 0) fail(`pgcrypto materialization failed: ${(psql.stderr || psql.stdout || '').trim()}`);

const plaintextBase64 = psql.stdout.replace(/\s+/g, '');
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(plaintextBase64)) fail('pgcrypto returned invalid base64 plaintext');
const sql = Buffer.from(plaintextBase64, 'base64');
const sha256 = createHash('sha256').update(sql).digest('hex');
if (sql.byteLength !== manifest.plaintext.bytes) {
  fail(`plaintext byte count mismatch: expected ${manifest.plaintext.bytes}, got ${sql.byteLength}`);
}
if (sha256 !== manifest.plaintext.sha256) {
  fail(`plaintext sha256 mismatch: expected ${manifest.plaintext.sha256}, got ${sha256}`);
}

const text = sql.toString('utf8');
const forbidden = [
  ['INSERT statements', /^\s*INSERT\s+INTO\b/im],
  ['COPY statements', /^\s*COPY\b/im],
  ['sequence values', /\b(?:pg_catalog\.)?setval\s*\(/i],
  ['ownership statements', /\bOWNER\s+TO\b/i],
  ['large objects', /\b(?:lo_create|lo_import|pg_largeobject)\b/i],
  ['managed auth/storage rows', /^\s*(?:INSERT|COPY)\s+(?:INTO\s+)?(?:auth|storage)\./im],
  ['Postgres connection strings', /postgres(?:ql)?:\/\//i],
  ['JWT-like tokens', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/],
  ['Supabase service keys', /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i],
];
for (const [label, pattern] of forbidden) if (pattern.test(text)) fail(`forbidden content detected: ${label}`);
for (const required of ['CREATE TABLE', 'CREATE POLICY', 'ROW LEVEL SECURITY']) {
  if (!text.includes(required)) fail(`required schema evidence missing: ${required}`);
}

await mkdir(generatedRoot, { recursive: true });
const plaintextPath = path.join(repoRoot, manifest.plaintext.path);
await writeFile(plaintextPath, sql, { mode: 0o600 });
console.log(`[current-state-schema] materialized ${path.relative(repoRoot, plaintextPath)}`);
console.log(`[current-state-schema] bytes=${sql.byteLength} sha256=${sha256}`);
