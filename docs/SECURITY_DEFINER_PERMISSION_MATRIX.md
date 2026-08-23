# SECURITY DEFINER Permission Matrix — PR-A

Read-only Production snapshot captured for Supabase project `fvaurkfnsvsfohpzguho` during PR-A. The Production catalog currently contains **117** `public` schema `SECURITY DEFINER` functions. This matrix prevents broad grant churn: a row marked `REVIEW` is preserved until a specific caller/compatibility proof exists.

Columns:
- **Expected caller** is the least-privilege classification based on the current source, grants, trigger linkage and internal authorization evidence.
- **A/Auth/Svc** are current Production effective EXECUTE privileges for `anon`, `authenticated`, and `service_role` before PR-A migration application.
- **Mutates** is a conservative source scan for state-changing SQL.
- **Internal auth** indicates explicit auth/admin/trusted-role checks found in the function body.
- **Tenant** indicates tenant-boundary logic is present.
- **Final required grants** is the PR-A decision. Only rows explicitly marked `PR-A` are changed by this PR.

| Function | Expected caller | A | Auth | Svc | Mutates | Internal auth | Tenant | Final required grants |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `accept_tenant_invitation(uuid,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `add_marketplace_dispute_message(uuid,uuid,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `advance_workflow_runtime(uuid,uuid,boolean,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `assert_translation_revision_snapshot(jsonb,jsonb)` | SYSTEM/INTERNAL / REVIEW | N | N | N | N | N | N | no direct browser grant |
| `checkout_marketplace_cart(uuid,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `clear_marketplace_cart(uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `create_marketplace_review(uuid,uuid,uuid,integer,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamp with time zone)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `create_translation_candidate_draft(text,text,text,text,jsonb,jsonb)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `current_admin_can_read_operations()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `current_admin_has_module_permission(text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `current_admin_is_super_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `current_user_has_tenant_role(uuid,text[])` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | Y | keep authenticated pending specific review |
| `current_user_is_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `evaluate_sla_business_runtime(uuid,text,text,timestamp with time zone)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | N | Y | keep authenticated pending specific review |
| `evaluate_sla_runtime(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | N | Y | keep authenticated pending specific review |
| `expire_tenant_invitations(uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | N | Y | keep authenticated pending specific review |
| `get_public_incident_status(text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `invalidate_content_translations_on_source_change()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `is_active_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `is_active_platform_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `is_translation_revision_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `lookup_public_agency_application(text,text)` | SERVICE ONLY | N | N | Y | N | N | N | service_role |
| `lookup_public_service_request(text)` | SERVICE ONLY | N | N | Y | N | N | N | service_role |
| `manage_sla_runtime_state(uuid,uuid,text,text,text,timestamp with time zone)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | N | Y | keep authenticated pending specific review |
| `manage_task_collaboration(uuid,uuid,text,jsonb)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `manage_task_runtime(uuid,uuid,text,jsonb)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `mark_translation_revisions_stale_on_source_change()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | N | N | no direct browser EXECUTE preferred |
| `open_marketplace_dispute(uuid,uuid,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `pr100_admin_requests_index(text,text,text,timestamp with time zone,timestamp with time zone,integer,integer)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr100_cleanup_security_guards()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `pr100_guard_ai_answer(text,jsonb)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr100_guard_password_reset(text,jsonb,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | N | N | N | service_role |
| `pr100_guard_public_lookup(text,text,text)` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `pr100_lookup_public_agency_application_by_code(text,text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `pr100_lookup_public_agency_application(text,text,text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `pr100_lookup_public_contact_message(text,text)` | SERVICE ONLY | N | N | Y | N | N | N | service_role |
| `pr100_lookup_public_job_application(text,text)` | SERVICE ONLY | N | N | Y | N | N | N | service_role |
| `pr100_lookup_public_service_request(text,text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `pr100_monthly_backup_dry_run()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr100_server_gateway(text,bigint,text,text,text,text)` | SYSTEM/INTERNAL / REVIEW | N | N | N | N | N | N | no direct browser grant |
| `pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)` | SERVICE ONLY | N | N | Y | Y | N | Y | service_role |
| `pr105_list_commerce_events(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | Y | keep authenticated pending specific review |
| `pr116_apply_trusted_admin_actor_context()` | SERVICE ONLY effective; compatibility grant under review | Y | Y | Y | N | Y | N | keep current pending compatibility proof |
| `pr116_moderate_review_submission(uuid,text)` | SERVICE ONLY | N | N | Y | Y | Y | Y | service_role |
| `pr3_blog_snapshot(bigint)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr3_create_blog_version(bigint,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `pr3_publish_blog_post(bigint)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr3_save_blog_post(bigint,text,text,text,text[],text,timestamp with time zone,jsonb)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr3_unpublish_blog_post(bigint)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr4_admin_can_module(text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr4_audit_kb()` | SYSTEM/TRIGGER ONLY | Y | Y | Y | Y | Y | N | **no browser EXECUTE (PR-A)** |
| `pr4_create_support_request(text,text,text,text,text,boolean)` | SERVICE ONLY | Y | Y | N | Y | N | Y | **service_role only (PR-A)** |
| `pr4_current_admin_id()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr4_emit_internal_notification()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | N | Y | no direct browser EXECUTE preferred |
| `pr4_escalate_overdue_support()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | Y | no direct browser grant |
| `pr4_notification_action(bigint[],text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr4_primary_tenant_id()` | SYSTEM/INTERNAL / REVIEW | N | N | N | N | N | Y | no direct browser grant |
| `pr4_promote_suggestion(bigint)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr4_request_support_deletion(text,text)` | INTENDED PUBLIC | Y | Y | N | Y | N | Y | keep current public contract |
| `pr4_save_knowledge(bigint,text,text,text[],text[],text,text,text,text,text,text,text,text,integer,timestamp with time zone,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr4_suggest_knowledge(text,text)` | INTENDED PUBLIC | Y | Y | N | Y | N | N | keep current public contract |
| `pr4_support_action(bigint,text,text,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr4_touch_kb()` | SYSTEM/TRIGGER ONLY | Y | Y | Y | N | N | N | **no browser EXECUTE (PR-A)** |
| `pr4_track_support_request(text,text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `pr99_audit_mutation()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | Y | N | no direct browser EXECUTE preferred |
| `pr99_backup_dry_run(jsonb,text[])` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_backup_schedule_status()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr99_build_backup_payload(text[])` | INTERNAL HELPER | N | Y | N | N | Y | N | **no browser EXECUTE (PR-A)** |
| `pr99_contact_notification()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | N | N | no direct browser EXECUTE preferred |
| `pr99_create_page_version(bigint,text,text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `pr99_create_private_backup(text[],text,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_enqueue_notification()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | N | N | no direct browser EXECUTE preferred |
| `pr99_guard_submission(text,text,jsonb,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_log_operation_failure(text,text,text,text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `pr99_mark_notifications_read(bigint[])` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_permanent_delete_trash(bigint,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_require_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | Y | N | keep authenticated pending specific review |
| `pr99_restore_backup(jsonb,text[])` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_restore_entity_rows(text,jsonb)` | INTERNAL HELPER | N | Y | N | Y | Y | N | **no browser EXECUTE (PR-A)** |
| `pr99_restore_trash(bigint)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `pr99_scheduled_private_backup()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `pr99_soft_delete(text,text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `pr99_submit_ai_support(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_submit_application(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_submit_contact(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_submit_job_application(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_submit_review(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | Y | service_role |
| `pr99_submit_service_request(jsonb,text,timestamp with time zone,text)` | SERVICE ONLY | N | N | Y | Y | N | N | service_role |
| `pr99_unanswered_support_notifications()` | SYSTEM/INTERNAL / REVIEW | N | N | N | Y | N | N | no direct browser grant |
| `pr99_unpublish_page(bigint,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `publish_page_builder_page(bigint,text,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `publish_translation_candidate(uuid)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `read_published_translation_revision_fields(text,text[],text)` | INTENDED PUBLIC | Y | Y | N | N | N | N | keep current public contract |
| `remove_marketplace_cart_item(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `request_marketplace_refund(uuid,uuid,numeric,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `require_translation_revision_admin()` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | N | N | keep authenticated pending specific review |
| `resend_tenant_invitation(uuid,uuid,text,timestamp with time zone)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `resolve_marketplace_dispute(uuid,uuid,text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `resolve_public_tenant_runtime(text)` | INTENDED PUBLIC | Y | Y | N | N | N | Y | keep current public contract |
| `restore_page_version(bigint)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | N | keep authenticated pending specific review |
| `resume_workflow_runtime(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `review_marketplace_refund(uuid,uuid,text,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `review_translation_candidate(uuid,text)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `revoke_tenant_invitation(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `save_page_builder_draft(bigint,text,jsonb,jsonb)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `save_translation_candidate_fields(uuid,jsonb)` | SERVICE ONLY | N | N | Y | Y | Y | N | service_role |
| `set_service_request_code_after_insert()` | SYSTEM/TRIGGER ONLY | N | N | N | Y | N | N | no direct browser EXECUTE preferred |
| `sla_runtime_kpis(uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | N | Y | keep authenticated pending specific review |
| `start_workflow_runtime(uuid,uuid,text,jsonb)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | N | Y | keep authenticated pending specific review |
| `task_runtime_evidence(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | N | Y | keep authenticated pending specific review |
| `toggle_marketplace_favorite(uuid,uuid,boolean)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `transition_marketplace_order(uuid,uuid,text)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `upsert_marketplace_cart_item(uuid,uuid,integer)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | Y | Y | Y | keep authenticated pending specific review |
| `workflow_runtime_evidence(uuid,uuid)` | INTENDED AUTHENTICATED / REVIEW | N | Y | N | N | N | Y | keep authenticated pending specific review |

## PR-A grant changes

Only these currently exposed functions are changed in PR-A:

1. `pr4_create_support_request(...)`: `anon/authenticated` → `service_role` only.
2. `pr99_build_backup_payload(text[])`: remove direct browser EXECUTE; trusted wrapper remains the entrypoint.
3. `pr99_restore_entity_rows(text,jsonb)`: remove direct browser EXECUTE; trusted wrapper remains the entrypoint.
4. `pr4_audit_kb()`: remove direct browser EXECUTE; trigger remains the caller.
5. `pr4_touch_kb()`: remove direct browser EXECUTE; trigger remains the caller.

`pr116_apply_trusted_admin_actor_context()` remains unchanged in this PR. Its broad grant is recorded as defense-in-depth/compatibility review because prior runtime evidence shows non-service activation and spoofed actor context fail closed.
