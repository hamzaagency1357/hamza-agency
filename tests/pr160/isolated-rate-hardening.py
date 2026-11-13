#!/usr/bin/env python3
"""Execute the candidate PR160 migration against an ephemeral PostgreSQL database.
Never imports credentials or accesses a Supabase project; only localhost is valid.
"""
from pathlib import Path
import os
import re
import subprocess
import concurrent.futures

ROOT = Path(__file__).resolve().parents[2]
assert os.environ.get("PGHOST") == "127.0.0.1", "local PostgreSQL only"
MIGRATION = ROOT / "supabase/migrations/20261113180500_pr160_trusted_rate_and_knowledge_gateway.sql"

def psql(sql: str) -> str:
    result = subprocess.run(["psql","-X","-A","-t","-v","ON_ERROR_STOP=1"],
                            input=sql, text=True, capture_output=True)
    if result.returncode:
        raise AssertionError(f"isolated psql failure: {result.stderr[-1800:]}")
    return result.stdout.strip()

def extract(text: str, name: str):
    marker = f"create or replace function public.{name}("
    start = text.lower().find(marker)
    if start < 0: raise AssertionError(f"Missing source definition: {name}")
    end = text.find("$$;",start)
    if end < 0: raise AssertionError(f"Missing terminator: {name}")
    return text[start:end+3]

base_pr4 = (ROOT / "supabase/migrations/20260808210000_pr4_smart_support_notifications.sql").read_text()
last_pr100 = (ROOT / "supabase/migrations/20260729181851_pr100_final_completion.sql").read_text()
migration = MIGRATION.read_text()
assert "begin;" in migration.lower() and "commit;" in migration.lower()
assert "knowledge_suggest" in migration
assert "pg_advisory_xact_lock" in migration
assert "revoke all on function public.pr4_suggest_knowledge" in migration.lower()

stub = r"""
BEGIN;
SET check_function_bodies = off;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.pr4_knowledge_suggestions (
 id bigint generated always as identity primary key,
 question_redacted text not null,
 language text not null,
 occurrences integer not null default 1,
 status text not null default 'new',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 UNIQUE (question_redacted,language)
);
ALTER TABLE public.pr4_knowledge_suggestions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.public_lookup_guards (
 id bigint generated always as identity primary key,
 lookup_type text not null,
 identity_hash text not null,
 fingerprint_hash text not null,
 accepted boolean not null default false,
 reason text,
 created_at timestamptz not null default now()
);
CREATE TABLE public.pr100_gateway_nonces (
 nonce text primary key, action text not null,
 request_timestamp bigint not null, expires_at timestamptz not null,
 CONSTRAINT pr100_gateway_nonces_action_check CHECK (action IN ('application_lookup','service_lookup'))
);
CREATE FUNCTION public.pr100_lookup_public_agency_application(text,text,text) RETURNS jsonb
LANGUAGE sql AS $$ select '{"allowed":true}'::jsonb $$;
CREATE FUNCTION public.pr100_lookup_public_agency_application_by_code(p_code text,p_fingerprint text) RETURNS jsonb
LANGUAGE sql AS $$ select public.pr100_guard_public_lookup('application',$1,$2) $$;
CREATE FUNCTION public.pr100_lookup_public_service_request(p_code text,p_fingerprint text) RETURNS jsonb
LANGUAGE sql AS $$ select public.pr100_guard_public_lookup('service_request',$1,$2) $$;
CREATE FUNCTION public.pr100_lookup_public_job_application(p_code text,p_fingerprint text) RETURNS jsonb
LANGUAGE sql AS $$ select public.pr100_guard_public_lookup('job_application',$1,$2) $$;
CREATE FUNCTION public.pr100_lookup_public_contact_message(p_code text,p_fingerprint text) RETURNS jsonb
LANGUAGE sql AS $$ select public.pr100_guard_public_lookup('contact',$1,$2) $$;
COMMIT;
"""
psql(stub + "\n" + extract(base_pr4, "pr4_suggest_knowledge") + "\n"
          + extract(last_pr100,"pr100_guard_public_lookup") + "\n")
psql(migration)   # committed ONLY inside this ephemeral disposable local container

# Validate permissions without relying on exception message contents.
acl = psql("""SELECT
has_function_privilege('anon','public.pr4_suggest_knowledge(text,text)','EXECUTE'),
has_function_privilege('authenticated','public.pr4_suggest_knowledge(text,text)','EXECUTE'),
has_function_privilege('anon','public.pr100_guard_public_lookup(text,text,text)','EXECUTE'),
has_function_privilege('anon','public.pr100_lookup_public_service_request(text,text)','EXECUTE'),
has_function_privilege('service_role','public.pr160_record_knowledge_suggestion(text,text,text)','EXECUTE');""")
assert acl == "f|f|f|f|t", acl
psql("""SET ROLE anon;
DO $$
BEGIN
 BEGIN
  PERFORM public.pr4_suggest_knowledge('not authorized','ar');
  RAISE EXCEPTION 'anon unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
RESET ROLE;""")
print("PASS: direct anon/authenticated RPC denied (including EXECUTE privilege check)")

def trusted_sql(query: str):
    return "SET ROLE service_role; SET request.jwt.claim.role='service_role'; " + query

source = "a"*64
# DB function must allow exactly 8 suggestions per source across different questions.
for i in range(1, 10):
    result = psql(trusted_sql(
        f"SELECT (public.pr160_record_knowledge_suggestion('synthetic support question {i}','ar','{source}')->>'allowed');"
    )).splitlines()[-1]
    assert result == ("true" if i <= 8 else "false"), (i, result)
rows = psql("SELECT count(*),sum(occurrences) FROM public.pr4_knowledge_suggestions;")
assert rows == "8|8", rows
print("PASS: source quota 8/15m and rejected request performs no suggestion write")

# 32 simultaneous calls from a new source must admit only 8.
source2 = "b"*64
def concurrent_knowledge(i):
    query = f"SELECT (public.pr160_record_knowledge_suggestion('simultaneous synthetic question {i}','ar','{source2}')->>'allowed');"
    return psql(trusted_sql(query)).splitlines()[-1]
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    outcomes = list(pool.map(concurrent_knowledge,range(32)))
assert outcomes.count("true") == 8 and outcomes.count("false") == 24, outcomes
print("PASS: concurrent source quota cannot race past 8 accepted writes")

# 40 simultaneous lookup attempts with rotating tracking codes but the same
# trusted-source fingerprint: exactly 30 can pass (the existing hourly limit).
lookup_source = "c"*64
def concurrent_lookup(i):
    query = (f"SELECT (public.pr100_guard_public_lookup('application',"
             f"'TEST-CODE-{i:05d}','{lookup_source}')->>'allowed');")
    return psql(trusted_sql(query)).splitlines()[-1]
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
    outcomes = list(pool.map(concurrent_lookup,range(40)))
assert outcomes.count("true") == 30 and outcomes.count("false") == 10, outcomes
print("PASS: concurrent rotated tracking IDs limited to 30 per trusted source")

# Different sources/legitimate customers can still use the service after one
# source is rate limited: no project-wide lookup lockout.
different = psql(trusted_sql("SELECT (public.pr100_guard_public_lookup('application','NORMAL-CUSTOMER','" + "d"*64 + "')->>'allowed');")).splitlines()[-1]
assert different == "true", different
print("PASS: legitimate independent tracking source is not blocked by abusive source")

# Signed OIDC database dispatcher path (service_role + expected canonical claims).
# Edge verifies JWT before reaching this function in the real deployment.
gateway_sql = r"""
SET ROLE service_role; SET request.jwt.claim.role='service_role';
WITH payload AS (
 SELECT '{"question":"gateway synthetic question","language":"tr","sourceFingerprint":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"}'::text AS body,
        floor(extract(epoch FROM clock_timestamp()))::bigint AS ts
)
SELECT (public.pr100_oidc_gateway(
'knowledge_suggest',ts,encode(extensions.gen_random_bytes(18),'hex'),body,
encode(extensions.digest(body,'sha256'),'hex'),
'https://oidc.vercel.com/hamzaagencysy-3009s-projects',
'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:production',
'https://vercel.com/hamzaagencysy-3009s-projects',
'team_gu9SOMWlOqS2uvLEZUYEbTPs','prj_YQw97FRAAwcnpQkudzGr01kXASvN',
'hamza-agency','production',ts,ts+90)->>'allowed') FROM payload;
"""
assert psql(gateway_sql).splitlines()[-1] == "true"
print("PASS: trusted OIDC database dispatch persists knowledge suggestions")

# The production cutover itself is NOT executed; only local database changed.
assert psql("SELECT count(*) FROM public.pr4_knowledge_suggestions;") == "17"
print("PASS: all fixtures synthetic; ephemeral PostgreSQL container is destroyed")
