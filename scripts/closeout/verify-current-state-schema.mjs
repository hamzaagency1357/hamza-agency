#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { chmod, readFile, rename, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { TextDecoder } from 'node:util';

const EXPECTED_BYTES = 496138;
const EXPECTED_SHA256 = '3b1890376e3cca966b1dce0979dd2ed089f95237e1067febf4f58e8f1bf776f2';
const [candidatePath, destinationPath = candidatePath, mode = 'verify'] = process.argv.slice(2);
if (!candidatePath || !['verify', 'write'].includes(mode)) {
  throw new Error('usage: verify-current-state-schema.mjs <candidate> [destination] [verify|write]');
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
let buffer = await readFile(candidatePath);
if (buffer.byteLength !== EXPECTED_BYTES || sha256(buffer) !== EXPECTED_SHA256) {
  const variants = [];
  if (buffer.subarray(-2).equals(Buffer.from('\r\n'))) variants.push(buffer.subarray(0, -2));
  if (buffer.subarray(-1).equals(Buffer.from('\n'))) variants.push(buffer.subarray(0, -1));
  const exact = variants.find((value) => value.byteLength === EXPECTED_BYTES && sha256(value) === EXPECTED_SHA256);
  if (exact) buffer = exact;
}

const digest = sha256(buffer);
if (buffer.byteLength !== EXPECTED_BYTES) throw new Error(`byte count mismatch: expected ${EXPECTED_BYTES}, got ${buffer.byteLength}`);
if (digest !== EXPECTED_SHA256) throw new Error(`sha256 mismatch: expected ${EXPECTED_SHA256}, got ${digest}`);

let text;
try {
  text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
} catch {
  throw new Error('snapshot is not valid UTF-8');
}
if (text.includes('\u0000')) throw new Error('snapshot contains NUL bytes');

const forbidden = [
  [/^\s*INSERT\s+INTO\b/im, 'INSERT data statement'],
  [/^\s*COPY\b/im, 'COPY data statement'],
  [/\b(?:pg_catalog\.)?setval\s*\(/i, 'setval sequence value'],
  [/\bOWNER\s+TO\b/i, 'ownership statement'],
  [/\b(?:lo_create|lo_import|pg_largeobject)\b/i, 'large-object reference'],
  [/postgres(?:ql)?:\/\/[^\s'"`]+/i, 'database connection string'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/i, 'private key'],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, 'JWT-like token'],
  [/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i, 'Supabase key'],
  [/\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|PGPASSWORD)\s*[:=]/i, 'credential assignment'],
  [/\b(?:CREATE|ALTER)\s+ROLE\b[^;]*\bPASSWORD\s+(?:'[^']*'|"[^"]*")/i, 'role password'],
  [/\bCREATE\s+(?:TABLE|SEQUENCE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:auth|storage|realtime|vault)\./i, 'managed-schema DDL'],
];
for (const [pattern, label] of forbidden) if (pattern.test(text)) throw new Error(`forbidden content detected: ${label}`);

for (const marker of [
  '-- HAMZA AGENCY sanitized current-state schema snapshot',
  'CREATE SCHEMA IF NOT EXISTS private;',
  'CREATE TABLE public.',
  'CREATE POLICY',
  'ROW LEVEL SECURITY',
]) {
  if (!text.includes(marker)) throw new Error(`required schema evidence missing: ${marker}`);
}

if (mode === 'write') {
  const temporaryPath = `${destinationPath}.verified-${process.pid}`;
  await writeFile(temporaryPath, buffer, { mode: 0o600 });
  await rename(temporaryPath, destinationPath);
  await chmod(destinationPath, 0o600);
}
console.log(`[current-state-schema] verified bytes=${buffer.byteLength} sha256=${digest}`);
