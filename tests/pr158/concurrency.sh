#!/usr/bin/env bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 <<'SQL'
SET test.actor='owner@example.test';
INSERT INTO trash_items(id,item_type,item_id,item_data,restore_status)
VALUES (30,'programs','30','{"id":20,"title":"Concurrent"}','restorable');
SQL
set +e
(psql -v ON_ERROR_STOP=1 -c "SET test.actor='owner@example.test'; SELECT public.pr99_restore_trash(30);" > /tmp/pr158-a.log 2>&1) &
a=$!
(psql -v ON_ERROR_STOP=1 -c "SET test.actor='owner@example.test'; SELECT public.pr99_restore_trash(30);" > /tmp/pr158-b.log 2>&1) &
b=$!
wait "$a"; sa=$?
wait "$b"; sb=$?
set -e
if ! { [ "$sa" -eq 0 ] && [ "$sb" -ne 0 ]; } && ! { [ "$sb" -eq 0 ] && [ "$sa" -ne 0 ]; }; then
  echo 'Expected exactly one successful concurrent restore'
  cat /tmp/pr158-a.log /tmp/pr158-b.log
  exit 1
fi
psql -v ON_ERROR_STOP=1 -At <<'SQL'
DO $$
BEGIN
 IF (SELECT count(*) FROM programs WHERE id=30) <> 1 THEN RAISE EXCEPTION 'Concurrent duplicate or missing row'; END IF;
 IF (SELECT count(*) FROM activity_logs WHERE action='trash_restore' AND entity_id='30') <> 1 THEN RAISE EXCEPTION 'Concurrent audit mismatch'; END IF;
END $$;
SQL
echo 'PR158 concurrent restore PASS'
