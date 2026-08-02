#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotRoot = path.join(repoRoot, 'supabase/current-state-schema');
const manifest = JSON.parse(await readFile(path.join(snapshotRoot, 'manifest.json'), 'utf8'));
const sqlPath = path.join(repoRoot, manifest.transport.path);

function fail(message) {
  console.error(`[current-state-schema] ${message}`);
  process.exit(1);
}

if (manifest.transport.type !== 'direct-sql') fail('manifest transport must be direct-sql');
const sqlBuffer = await readFile(sqlPath);
const digest = createHash('sha256').update(sqlBuffer).digest('hex');
if (sqlBuffer.byteLength !== manifest.plaintext.bytes) {
  fail(`plaintext byte count mismatch: expected ${manifest.plaintext.bytes}, got ${sqlBuffer.byteLength}`);
}
if (digest !== manifest.plaintext.sha256) {
  fail(`plaintext sha256 mismatch: expected ${manifest.plaintext.sha256}, got ${digest}`);
}

let sql;
try {
  sql = new TextDecoder('utf-8', { fatal: true }).decode(sqlBuffer);
} catch {
  fail('snapshot is not valid UTF-8');
}
if (sql.includes('\u0000')) fail('snapshot contains NUL bytes');

// DML tokens inside function/procedure bodies are schema definitions, not exported rows.
// Mask dollar-quoted bodies before checking for top-level INSERT/COPY statements.
const topLevelSql = sql.replace(
  /\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g,
  (block) => block.replace(/[^\n]/g, ' '),
);

const forbidden = [
  [topLevelSql, /^\s*INSERT\s+INTO\b/im, 'INSERT data statement'],
  [topLevelSql, /^\s*COPY\b/im, 'COPY data statement'],
  [sql, /\b(?:pg_catalog\.)?setval\s*\(/i, 'setval sequence value'],
  [sql, /\bOWNER\s+TO\b/i, 'ownership statement'],
  [sql, /\b(?:lo_create|lo_import|pg_largeobject)\b/i, 'large-object reference'],
  [sql, /postgres(?:ql)?:\/\/[^\s'"`]+/i, 'database connection string'],
  [sql, /-----BEGIN [A-Z ]*PRIVATE KEY-----/i, 'private key'],
  [sql, /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT-like token'],
  [sql, /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i, 'Supabase key'],
  [sql, /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|PGPASSWORD)\s*[:=]/i, 'credential assignment'],
  [sql, /\b(?:CREATE|ALTER)\s+ROLE\b[^;]*\bPASSWORD\s+(?:'[^']*'|"[^"]*")/i, 'role password'],
  [sql, /\bCREATE\s+(?:TABLE|SEQUENCE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:auth|storage|realtime|vault)\./i, 'managed-schema DDL'],
];
for (const [source, pattern, label] of forbidden) {
  if (pattern.test(source)) fail(`forbidden content detected: ${label}`);
}

for (const required of [
  '-- HAMZA AGENCY sanitized current-state schema snapshot',
  'CREATE SCHEMA IF NOT EXISTS private;',
  'CREATE TABLE public.',
  'CREATE POLICY',
  'ROW LEVEL SECURITY',
]) {
  if (!sql.includes(required)) fail(`required schema evidence missing: ${required}`);
}

for (const legacyDirectory of ['parts', 'generated']) {
  const directory = path.join(snapshotRoot, legacyDirectory);
  try {
    await access(directory);
    const entries = await readdir(directory);
    if (entries.length > 0) fail(`legacy ${legacyDirectory} directory is not empty`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log(`[current-state-schema] verified ${path.relative(repoRoot, sqlPath)}`);
console.log(`[current-state-schema] bytes=${sqlBuffer.byteLength} sha256=${digest}`);
