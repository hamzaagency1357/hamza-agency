#!/usr/bin/env python3
"""Read-only Git history scan. Never prints candidate secret values."""
import argparse
import collections
import hashlib
import re
import subprocess
import sys

ASSIGN = re.compile(rb'(?i)\b(?:SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY|VERCEL_TOKEN|GITHUB_TOKEN|GH_TOKEN|DATABASE_URL|POSTGRES_PASSWORD|PAYMENT_WEBHOOK_SECRET|SESSION_HASH_KEY|PUSH_SUBSCRIPTION_ENCRYPTION_KEY|SMTP_PASSWORD|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["\']?([^\s"\'\r\n,;]{8,})')
PATTERNS = {
 'private_key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----'),
 'github_token': re.compile(rb'\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}\b'),
 'github_pat': re.compile(rb'\bgithub_pat_[a-zA-Z0-9_]{40,}\b'),
 'supabase_secret': re.compile(rb'\bsb_secret_[A-Za-z0-9_-]{20,}\b'),
 'google_key': re.compile(rb'\bAIza[0-9A-Za-z_-]{35}\b'),
 'aws_access_key': re.compile(rb'\b(?:AKIA|ASIA)[0-9A-Z]{16}\b'),
 'postgres_uri': re.compile(rb'(?i)\bpostgres(?:ql)?://[^\s:@/]{1,80}:[^\s:@/]{8,}@[^\s/]{4,}'),
}
DUMMY = re.compile(rb'(?i)(?:\$\{|\$\(|<[^>]{0,80}>|example|placeholder|dummy|not-real|fake|changeme|your[-_]|replace[-_]|test[-_]|redacted|xxxxx|^\.\.\.$|local-only|isolated|fixture|synthetic|hardcodedproductionvalue12345|localhost|127[.]0[.]0[.]1|secrets[.]GITHUB_TOKEN|\$[A-Za-z_][A-Za-z0-9_]*|stub)')
MAX_BLOB = 1_048_576

def run(command):
 return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout

def read_exact(stream, length):
 chunks=[]
 remaining=length
 while remaining:
  chunk=stream.read(min(65536,remaining))
  if not chunk: raise EOFError('git cat-file stream incomplete')
  chunks.append(chunk)
  remaining-=len(chunk)
 return b''.join(chunks)

def synthetic_fixture(path, kind, match, blob):
 """Narrow source-context exceptions for previously verified synthetic examples."""
 pos=match.start()
 if path=='scripts/scan-git-history-secrets.py':
  marker=blob.find(b'def self_test():')
  return marker>=0 and pos>marker
 # Historical disposable PR160 CI PostgreSQL fixture; exact path and exact value only.
 if path=='.github/workflows/pr160-isolated-rate-boundaries.yml' and kind=='sensitive_assignment':
  return (match.group(0)==b'POSTGRES_PASSWORD: local_only_test'
          and b'image: postgres:16' in blob
          and b'PGHOST: 127.0.0.1' in blob)
 if path=='.github/workflows/pr101-checkpoint-1b-local-e2e.yml' and kind=='sensitive_assignment':
  return b'SESSION_HASH_KEY' in match.group(0) and b'PR101_' in blob
 if path in ('tests/vercel-production-attestation.test.mjs','tests/forward-production-contract.test.mjs'):
  context=blob[max(0,pos-220):pos]
  return kind=='sensitive_assignment' and b'assert.match' in context
 return False

def detect(blob, path=''):
 result=set()
 for match in ASSIGN.finditer(blob):
  value=match.group(1)
  if not DUMMY.search(value) and not value.startswith(b'$') and not synthetic_fixture(path,'sensitive_assignment',match,blob):
   result.add('sensitive_assignment')
 for kind,pattern in PATTERNS.items():
  for match in pattern.finditer(blob):
   if not DUMMY.search(match.group()) and not synthetic_fixture(path,kind,match,blob):
    result.add(kind)
 return result

def is_runtime_env_path(name):
 leaf=name.rsplit('/',1)[-1].lower()
 if leaf=='.env': return True
 return leaf.startswith('.env.') and not leaf.endswith(('.example','.sample','.template','.dist','.defaults'))

def scan():
 if run(['git','rev-parse','--is-shallow-repository']).strip()!=b'false':
  raise RuntimeError('Shallow checkout cannot establish complete history')
 raw=run(['git','rev-list','--objects','--all']).splitlines()
 distinct={}
 for line in raw:
  sha,_,path=line.partition(b' ')
  if len(sha)==40: distinct.setdefault(sha.decode(),path.decode('utf-8','replace'))
 counts=collections.Counter()
 findings=collections.Counter()
 incomplete=set()
 # Review every path ever recorded, even if its blob matches a template.
 names=run(['git','log','--all','--pretty=format:','--name-only']).decode('utf-8','replace').splitlines()
 runtime_env_paths={name for name in names if is_runtime_env_path(name)}
 for name in sorted(runtime_env_paths):
  findings['historical_runtime_env_file']+=1
  print('POTENTIAL_SECRET category=historical_runtime_env_file path_hash='+hashlib.sha256(name.encode()).hexdigest()[:10])
 proc=subprocess.Popen(['git','cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,bufsize=0)
 try:
  for sha,path in distinct.items():
   proc.stdin.write((sha+'\n').encode())
   header=proc.stdout.readline().split()
   if len(header)!=3:
    incomplete.add('git_object_incomplete')
    break
   try: size=int(header[2])
   except ValueError:
    incomplete.add('git_object_invalid')
    break
   if header[1]!=b'blob':
    read_exact(proc.stdout,size+1)
    continue
   counts['blobs']+=1
   if size>MAX_BLOB:
    prefix=read_exact(proc.stdout,min(size,2048))
    remaining=size-len(prefix)
    while remaining:
     chunk=read_exact(proc.stdout,min(65536,remaining))
     remaining-=len(chunk)
    read_exact(proc.stdout,1)
    ext=path.lower().endswith(('.png','.jpg','.jpeg','.webp','.gif','.ico','.mp4','.mov','.pdf','.woff','.woff2','.ttf','.otf','.zip','.gz','.svgz'))
    if b'\0' in prefix or ext: counts['binary_skipped']+=1
    else: incomplete.add('oversized_text_blob_requires_review')
    continue
   data=read_exact(proc.stdout,size)
   read_exact(proc.stdout,1)
   if b'\0' in data[:2048]:
    counts['binary_skipped']+=1
    continue
   counts['text_blobs']+=1
   for kind in detect(data,path):
    findings[kind]+=1
    print('POTENTIAL_SECRET category='+kind+' path_hash='+hashlib.sha256(path.encode()).hexdigest()[:10])
 finally:
  proc.stdin.close()
  proc.stdout.close()
  proc.wait(timeout=60)
 print('HISTORY_SCAN objects=%s blobs=%s text_blobs=%s binary_skipped=%s suspected=%s incomplete=%s'%(len(distinct),counts['blobs'],counts['text_blobs'],counts['binary_skipped'],sum(findings.values()),len(incomplete)))
 for reason in sorted(incomplete): print('INCOMPLETE',reason)
 return int(bool(findings or incomplete))

def self_test():
 for example in [b'SUPABASE_SERVICE_ROLE_KEY=placeholder',b'GEMINI_API_KEY='+bytes([36])+b'{KEY}',b'GITHUB_TOKEN=your-token']:
  assert not detect(example)
 assert 'sensitive_assignment' in detect(b'SUPABASE_'+b'SERVICE_ROLE_KEY=uniqueactualvalue12345')
 assert 'private_key' in detect(b'-----BEGIN '+b'PRIVATE KEY-----')
 assert 'github_token' in detect(b'ghp_'+b'A'*36)
 assert is_runtime_env_path('any/.env.production')
 assert is_runtime_env_path('.env.local')
 assert not is_runtime_env_path('.env.example')
 assert 'sensitive_assignment' in detect(b'SUPABASE_'+b'SERVICE_ROLE_KEY=actualvalue12345678', 'app/api/route.ts')
 fixture=b'image: postgres:16\nPGHOST: 127.0.0.1\nPOSTGRES_PASSWORD: local_only_test'
 assert not detect(fixture,'.github/workflows/pr160-isolated-rate-boundaries.yml')
 assert 'sensitive_assignment' in detect(b'image: postgres:16\nPGHOST: 127.0.0.1\nPOSTGRES_PASSWORD: real-live-password-1234','.github/workflows/pr160-isolated-rate-boundaries.yml')
 assert 'sensitive_assignment' in detect(fixture,'some-other-path.yml')
 print('HISTORY_SCAN_SELF_TEST_PASS')

if __name__=='__main__':
 p=argparse.ArgumentParser()
 p.add_argument('--self-test',action='store_true')
 args=p.parse_args()
 try:
  if args.self_test: self_test()
  else: sys.exit(scan())
 except (OSError,EOFError,subprocess.CalledProcessError,RuntimeError) as exc:
  print('HISTORY_SCAN_INCOMPLETE',type(exc).__name__)
  sys.exit(2)
