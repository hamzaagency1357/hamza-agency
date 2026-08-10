export type Pr116AdminActionContract =
  | { kind: "entity"; table: string; method: "insert" | "update" | "upsert" | "delete"; module: string; permission: string; allowedFields: readonly string[]; allowedFilters: readonly string[]; allowedSelects: readonly string[]; returnFields: readonly string[] }
  | { kind: "rpc"; rpcName: string; module: string; permission: string; allowedFields: readonly string[] }
  | { kind: "auth"; authOperation: "update_verified_user"; module: string; permission: string; allowedFields: readonly string[] }
  | { kind: "storage"; bucket: string; storageMethod: "upload" | "update" | "remove" | "move" | "copy"; module: string; permission: string }
  | { kind: "trash"; itemType: string; module: string; permission: string; allowedFields: readonly string[] };

export const PR116_ADMIN_ACTION_CONTRACTS = {
  "pr116_ai_support_page_rpc_pr4_support_action_call": {
    "kind": "rpc",
    "rpcName": "pr4_support_action",
    "module": "ai_support",
    "permission": "can_edit",
    "allowedFields": [
      "p_action",
      "p_note",
      "p_request_id",
      "p_value"
    ]
  },
  "pr116_announcements_page_entity_announcements_insert": {
    "kind": "entity",
    "table": "announcements",
    "method": "insert",
    "module": "announcements",
    "permission": "can_create",
    "allowedFields": [
      "content",
      "end_date",
      "is_active",
      "priority",
      "show_on_homepage",
      "start_date",
      "title",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_announcements_page_entity_announcements_update": {
    "kind": "entity",
    "table": "announcements",
    "method": "update",
    "module": "announcements",
    "permission": "can_edit",
    "allowedFields": [
      "is_active",
      "show_on_homepage",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productanalyticsconsole_rpc_refresh_product_kpis_call": {
    "kind": "rpc",
    "rpcName": "refresh_product_kpis",
    "module": "analytics",
    "permission": "can_edit",
    "allowedFields": [
      "p_metric_date",
      "p_tenant"
    ]
  },
  "pr116_component_productexpansionconsole_entity_tenant_admin_audit_insert": {
    "kind": "entity",
    "table": "tenant_admin_audit",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "action",
      "after_data",
      "entity_id",
      "entity_type",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productexpansionconsole_entity_tenant_branding_upsert": {
    "kind": "entity",
    "table": "tenant_branding",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productexpansionconsole_entity_tenant_feature_flags_update": {
    "kind": "entity",
    "table": "tenant_feature_flags",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "enabled",
      "updated_at"
    ],
    "allowedFilters": [
      "feature_key",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_incident_updates_insert": {
    "kind": "entity",
    "table": "incident_updates",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "created_by",
      "incident_id",
      "is_public",
      "message",
      "status",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_incidents_insert": {
    "kind": "entity",
    "table": "incidents",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "owner_id",
      "severity",
      "status",
      "tenant_id",
      "title"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id"
    ],
    "returnFields": [
      "id"
    ]
  },
  "pr116_component_productoperationsconsole_entity_incidents_update": {
    "kind": "entity",
    "table": "incidents",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "resolved_at",
      "status"
    ],
    "allowedFilters": [
      "id",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_marketplace_categories_insert": {
    "kind": "entity",
    "table": "marketplace_categories",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "active",
      "slug",
      "tenant_id",
      "translations"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_marketplace_listing_translations_insert": {
    "kind": "entity",
    "table": "marketplace_listing_translations",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "description",
      "listing_id",
      "locale",
      "summary",
      "tenant_id",
      "title"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_marketplace_listings_insert": {
    "kind": "entity",
    "table": "marketplace_listings",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "availability",
      "category_id",
      "currency",
      "listing_type",
      "media_ids",
      "price_amount",
      "slug",
      "status",
      "tenant_id",
      "translations"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id"
    ],
    "returnFields": [
      "id"
    ]
  },
  "pr116_component_productoperationsconsole_entity_marketplace_listings_update": {
    "kind": "entity",
    "table": "marketplace_listings",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_marketplace_orders_update": {
    "kind": "entity",
    "table": "marketplace_orders",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_privacy_requests_update": {
    "kind": "entity",
    "table": "privacy_requests",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "completed_at",
      "status"
    ],
    "allowedFilters": [
      "id",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_sla_policies_insert": {
    "kind": "entity",
    "table": "sla_policies",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "active",
      "business_hours",
      "entity_type",
      "first_response_minutes",
      "name",
      "pause_statuses",
      "resolution_minutes",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id"
    ],
    "returnFields": [
      "id"
    ]
  },
  "pr116_component_productoperationsconsole_entity_task_assignments_insert": {
    "kind": "entity",
    "table": "task_assignments",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "assignment_type",
      "task_id",
      "tenant_id",
      "user_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_task_comments_insert": {
    "kind": "entity",
    "table": "task_comments",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "author_id",
      "body",
      "is_internal",
      "task_id",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_tasks_insert": {
    "kind": "entity",
    "table": "tasks",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "created_by",
      "description",
      "due_at",
      "priority",
      "tenant_id",
      "title"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id"
    ],
    "returnFields": [
      "id"
    ]
  },
  "pr116_component_productoperationsconsole_entity_tasks_update": {
    "kind": "entity",
    "table": "tasks",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_tenant_admin_audit_insert": {
    "kind": "entity",
    "table": "tenant_admin_audit",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "action",
      "actor_id",
      "after_data",
      "entity_id",
      "entity_type",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_workflow_definitions_insert": {
    "kind": "entity",
    "table": "workflow_definitions",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "created_by",
      "definition",
      "name",
      "status",
      "tenant_id",
      "trigger_type",
      "version"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id"
    ],
    "returnFields": [
      "id"
    ]
  },
  "pr116_component_productoperationsconsole_entity_workflow_definitions_update": {
    "kind": "entity",
    "table": "workflow_definitions",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id",
      "status",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_productoperationsconsole_entity_workflow_steps_insert": {
    "kind": "entity",
    "table": "workflow_steps",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "configuration",
      "position",
      "retry_limit",
      "step_key",
      "step_type",
      "tenant_id",
      "workflow_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenant_admin_audit_insert": {
    "kind": "entity",
    "table": "tenant_admin_audit",
    "method": "insert",
    "module": "permissions",
    "permission": "can_create",
    "allowedFields": [
      "action",
      "actor_id",
      "after_data",
      "entity_id",
      "entity_type",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenant_branding_upsert": {
    "kind": "entity",
    "table": "tenant_branding",
    "method": "upsert",
    "module": "permissions",
    "permission": "can_edit",
    "allowedFields": [
      "legal_overrides",
      "social_links",
      "tenant_id",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenant_domains_insert": {
    "kind": "entity",
    "table": "tenant_domains",
    "method": "insert",
    "module": "permissions",
    "permission": "can_create",
    "allowedFields": [
      "hostname",
      "is_primary",
      "status",
      "tenant_id"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenant_feature_flags_update": {
    "kind": "entity",
    "table": "tenant_feature_flags",
    "method": "update",
    "module": "permissions",
    "permission": "can_edit",
    "allowedFields": [
      "enabled",
      "updated_at"
    ],
    "allowedFilters": [
      "feature_key",
      "tenant_id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenant_settings_upsert": {
    "kind": "entity",
    "table": "tenant_settings",
    "method": "upsert",
    "module": "permissions",
    "permission": "can_edit",
    "allowedFields": [
      "is_secret",
      "key",
      "tenant_id",
      "updated_at",
      "value"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_component_tenantgovernanceconsole_entity_tenants_update": {
    "kind": "entity",
    "table": "tenants",
    "method": "update",
    "module": "permissions",
    "permission": "can_edit",
    "allowedFields": [
      "default_locale",
      "name",
      "supported_locales",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_contact_page_entity_contact_messages_update": {
    "kind": "entity",
    "table": "contact_messages",
    "method": "update",
    "module": "contact",
    "permission": "can_edit",
    "allowedFields": [
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_faqs_page_entity_faqs_insert": {
    "kind": "entity",
    "table": "faqs",
    "method": "insert",
    "module": "pages",
    "permission": "can_create",
    "allowedFields": [
      "answer",
      "category",
      "is_published",
      "question",
      "sort_order"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id, question, answer, category, sort_order, is_published"
    ],
    "returnFields": [
      "id",
      "question",
      "answer",
      "category",
      "sort_order",
      "is_published"
    ]
  },
  "pr116_faqs_page_entity_faqs_update": {
    "kind": "entity",
    "table": "faqs",
    "method": "update",
    "module": "pages",
    "permission": "can_edit",
    "allowedFields": [
      "answer",
      "category",
      "is_published",
      "question",
      "sort_order"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [
      "id, question, answer, category, sort_order, is_published"
    ],
    "returnFields": [
      "id",
      "question",
      "answer",
      "category",
      "sort_order",
      "is_published"
    ]
  },
  "pr116_gallery_page_entity_gallery_items_insert": {
    "kind": "entity",
    "table": "gallery_items",
    "method": "insert",
    "module": "gallery",
    "permission": "can_create",
    "allowedFields": [
      "alt_text",
      "button_label",
      "button_url",
      "category",
      "description",
      "effect_type",
      "external_url",
      "is_featured",
      "is_visible",
      "media_type",
      "media_url",
      "metadata",
      "slug",
      "sort_order",
      "status",
      "thumbnail_url",
      "title",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_gallery_page_entity_gallery_items_update": {
    "kind": "entity",
    "table": "gallery_items",
    "method": "update",
    "module": "gallery",
    "permission": "can_edit",
    "allowedFields": [
      "is_featured",
      "is_visible",
      "sort_order",
      "status",
      "title",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_jobs_page_entity_job_applications_update": {
    "kind": "entity",
    "table": "job_applications",
    "method": "update",
    "module": "jobs",
    "permission": "can_edit",
    "allowedFields": [
      "internal_notes",
      "status"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_jobs_page_entity_jobs_insert": {
    "kind": "entity",
    "table": "jobs",
    "method": "insert",
    "module": "jobs",
    "permission": "can_create",
    "allowedFields": [
      "department",
      "description",
      "is_visible",
      "job_type",
      "location",
      "requirements",
      "short_description",
      "slug",
      "sort_order",
      "status",
      "title"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_jobs_page_entity_jobs_update": {
    "kind": "entity",
    "table": "jobs",
    "method": "update",
    "module": "jobs",
    "permission": "can_edit",
    "allowedFields": [
      "department",
      "description",
      "is_visible",
      "job_type",
      "location",
      "requirements",
      "short_description",
      "slug",
      "sort_order",
      "status",
      "title"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_knowledge_base_page_rpc_pr4_promote_suggestion_call": {
    "kind": "rpc",
    "rpcName": "pr4_promote_suggestion",
    "module": "knowledge_base",
    "permission": "can_edit",
    "allowedFields": [
      "p_suggestion_id"
    ]
  },
  "pr116_knowledge_base_page_rpc_pr4_save_knowledge_call": {
    "kind": "rpc",
    "rpcName": "pr4_save_knowledge",
    "module": "knowledge_base",
    "permission": "can_edit",
    "allowedFields": [
      "p_alternatives",
      "p_answer",
      "p_category",
      "p_expires_at",
      "p_id",
      "p_keywords",
      "p_language",
      "p_page_path",
      "p_priority",
      "p_program_slug",
      "p_question",
      "p_service_slug",
      "p_source_label",
      "p_source_type",
      "p_source_url",
      "p_start_at",
      "p_status"
    ]
  },
  "pr116_media_cinematic_page_entity_media_delete": {
    "kind": "entity",
    "table": "media",
    "method": "delete",
    "module": "media",
    "permission": "can_delete",
    "allowedFields": [],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_media_cinematic_page_entity_media_insert": {
    "kind": "entity",
    "table": "media",
    "method": "insert",
    "module": "media",
    "permission": "can_create",
    "allowedFields": [
      "alt_text",
      "autoplay",
      "blur_px",
      "category",
      "desktop_fallback_url",
      "desktop_url",
      "dimming",
      "file_type",
      "file_url",
      "focal_position",
      "is_active",
      "loop",
      "mobile_fallback_url",
      "mobile_url",
      "name",
      "opacity",
      "overlay_strength",
      "page_slug",
      "poster_url",
      "publish_at",
      "status",
      "unpublish_at",
      "updated_at",
      "uploaded_by",
      "usage_context"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_media_cinematic_page_entity_media_update": {
    "kind": "entity",
    "table": "media",
    "method": "update",
    "module": "media",
    "permission": "can_edit",
    "allowedFields": [
      "is_active",
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_media_cinematic_page_storage_media_library_upload": {
    "kind": "storage",
    "bucket": "media-library",
    "storageMethod": "upload",
    "module": "media",
    "permission": "can_edit"
  },
  "pr116_media_page_entity_media_insert": {
    "kind": "entity",
    "table": "media",
    "method": "insert",
    "module": "media",
    "permission": "can_create",
    "allowedFields": [
      "alt_text",
      "category",
      "file_type",
      "file_url",
      "is_active",
      "name",
      "page_slug",
      "updated_at",
      "uploaded_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_media_page_entity_media_update": {
    "kind": "entity",
    "table": "media",
    "method": "update",
    "module": "media",
    "permission": "can_edit",
    "allowedFields": [
      "category",
      "is_active",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_media_page_storage_media_library_upload": {
    "kind": "storage",
    "bucket": "media-library",
    "storageMethod": "upload",
    "module": "media",
    "permission": "can_edit"
  },
  "pr116_page_entity_agency_applications_update": {
    "kind": "entity",
    "table": "agency_applications",
    "method": "update",
    "module": "dashboard",
    "permission": "can_edit",
    "allowedFields": [
      "internal_notes"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_pages_page_entity_pages_insert": {
    "kind": "entity",
    "table": "pages",
    "method": "insert",
    "module": "pages",
    "permission": "can_create",
    "allowedFields": [
      "content",
      "is_homepage",
      "is_published",
      "og_image",
      "seo_description",
      "seo_keywords",
      "seo_title",
      "slug",
      "sort_order",
      "title",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_pages_page_entity_pages_update": {
    "kind": "entity",
    "table": "pages",
    "method": "update",
    "module": "pages",
    "permission": "can_edit",
    "allowedFields": [
      "is_homepage",
      "is_published",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_partners_page_entity_partners_insert": {
    "kind": "entity",
    "table": "partners",
    "method": "insert",
    "module": "partners",
    "permission": "can_create",
    "allowedFields": [
      "badge",
      "category",
      "description",
      "detail_url",
      "is_featured",
      "is_visible",
      "logo_url",
      "name",
      "slug",
      "sort_order",
      "status",
      "updated_at",
      "website_url"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_partners_page_entity_partners_update": {
    "kind": "entity",
    "table": "partners",
    "method": "update",
    "module": "partners",
    "permission": "can_edit",
    "allowedFields": [
      "is_featured",
      "is_visible",
      "name",
      "sort_order",
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_permissions_page_entity_admin_permissions_delete": {
    "kind": "entity",
    "table": "admin_permissions",
    "method": "delete",
    "module": "permissions",
    "permission": "can_delete",
    "allowedFields": [],
    "allowedFilters": [
      "admin_email",
      "module_key"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_permissions_page_entity_admin_permissions_upsert": {
    "kind": "entity",
    "table": "admin_permissions",
    "method": "upsert",
    "module": "permissions",
    "permission": "can_edit",
    "allowedFields": [
      "admin_email",
      "can_create",
      "can_delete",
      "can_edit",
      "can_export",
      "can_manage",
      "can_view",
      "module_key",
      "notes",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_programs_media_page_entity_programs_update": {
    "kind": "entity",
    "table": "programs",
    "method": "update",
    "module": "programs",
    "permission": "can_edit",
    "allowedFields": [
      "alt_ar",
      "alt_en",
      "alt_tr",
      "detail_layout",
      "hero_image_url",
      "logo_url",
      "media_display_mode",
      "mobile_image_url",
      "og_image_url",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_programs_page_entity_programs_insert": {
    "kind": "entity",
    "table": "programs",
    "method": "insert",
    "module": "programs",
    "permission": "can_create",
    "allowedFields": [
      "benefits",
      "description",
      "faq",
      "is_active",
      "is_visible",
      "name",
      "requirements",
      "short_description",
      "slug",
      "sort_order",
      "status",
      "updated_at",
      "updates"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_programs_page_entity_programs_update": {
    "kind": "entity",
    "table": "programs",
    "method": "update",
    "module": "programs",
    "permission": "can_edit",
    "allowedFields": [
      "is_active",
      "is_visible",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_reset_password_page_auth_self_update": {
    "kind": "auth",
    "authOperation": "update_verified_user",
    "module": "settings",
    "permission": "can_manage",
    "allowedFields": [
      "password"
    ]
  },
  "pr116_reviews_page_entity_reviews_insert": {
    "kind": "entity",
    "table": "reviews",
    "method": "insert",
    "module": "reviews",
    "permission": "can_create",
    "allowedFields": [
      "avatar_url",
      "content",
      "country",
      "is_featured",
      "is_visible",
      "platform",
      "rating",
      "reviewer_name",
      "sort_order",
      "status",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_reviews_page_entity_reviews_update": {
    "kind": "entity",
    "table": "reviews",
    "method": "update",
    "module": "reviews",
    "permission": "can_edit",
    "allowedFields": [
      "is_featured",
      "is_visible",
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_sections_page_entity_sections_insert": {
    "kind": "entity",
    "table": "sections",
    "method": "insert",
    "module": "pages",
    "permission": "can_create",
    "allowedFields": [
      "is_visible",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_sections_page_entity_sections_update": {
    "kind": "entity",
    "table": "sections",
    "method": "update",
    "module": "pages",
    "permission": "can_edit",
    "allowedFields": [
      "is_visible",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_service_requests_page_entity_service_requests_update": {
    "kind": "entity",
    "table": "service_requests",
    "method": "update",
    "module": "service_requests",
    "permission": "can_edit",
    "allowedFields": [
      "internal_notes",
      "status"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [
      "*"
    ],
    "returnFields": []
  },
  "pr116_settings_homepage_page_entity_settings_insert": {
    "kind": "entity",
    "table": "settings",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "description",
      "group_name",
      "input_type",
      "is_public",
      "label_ar",
      "label_en",
      "setting_group",
      "setting_key",
      "setting_value",
      "sort_order",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_settings_homepage_page_entity_settings_update": {
    "kind": "entity",
    "table": "settings",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "setting_value",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_settings_identity_page_entity_settings_insert": {
    "kind": "entity",
    "table": "settings",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "description",
      "group_name",
      "input_type",
      "is_public",
      "label_ar",
      "label_en",
      "setting_group",
      "setting_key",
      "setting_value",
      "sort_order"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id,setting_key"
    ],
    "returnFields": [
      "id",
      "setting_key"
    ]
  },
  "pr116_settings_identity_page_entity_settings_update": {
    "kind": "entity",
    "table": "settings",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "description",
      "group_name",
      "input_type",
      "is_public",
      "label_ar",
      "setting_group",
      "setting_value",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_settings_page_entity_settings_insert": {
    "kind": "entity",
    "table": "settings",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "description",
      "group_name",
      "input_type",
      "is_public",
      "label_ar",
      "label_en",
      "setting_group",
      "setting_key",
      "setting_value",
      "sort_order",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_settings_page_entity_settings_update": {
    "kind": "entity",
    "table": "settings",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "description",
      "group_name",
      "input_type",
      "is_public",
      "label_ar",
      "label_en",
      "setting_group",
      "setting_key",
      "setting_value",
      "sort_order",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_success_stories_page_entity_success_stories_insert": {
    "kind": "entity",
    "table": "success_stories",
    "method": "insert",
    "module": "success_stories",
    "permission": "can_create",
    "allowedFields": [
      "country",
      "created_at",
      "image_url",
      "is_featured",
      "is_visible",
      "person_name",
      "platform",
      "result_summary",
      "sort_order",
      "status",
      "story",
      "title",
      "updated_at"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_success_stories_page_entity_success_stories_update": {
    "kind": "entity",
    "table": "success_stories",
    "method": "update",
    "module": "success_stories",
    "permission": "can_edit",
    "allowedFields": [
      "is_featured",
      "is_visible",
      "status",
      "updated_at"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_announcements_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "announcements",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_cms_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_gallery_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "gallery",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_jobs_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_partners_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "partners",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_program_details_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_programs_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_reviews_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "reviews",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_revisions_page_rpc_publish_translation_candidate_call": {
    "kind": "rpc",
    "rpcName": "publish_translation_candidate",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "p_translation_revision_id"
    ]
  },
  "pr116_translations_revisions_page_rpc_review_translation_candidate_call": {
    "kind": "rpc",
    "rpcName": "review_translation_candidate",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "p_review_notes",
      "p_translation_revision_id"
    ]
  },
  "pr116_translations_revisions_page_rpc_save_translation_candidate_fields_call": {
    "kind": "rpc",
    "rpcName": "save_translation_candidate_fields",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "p_translated_fields",
      "p_translation_revision_id"
    ]
  },
  "pr116_translations_sections_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_translations_success_stories_page_entity_content_translations_upsert": {
    "kind": "entity",
    "table": "content_translations",
    "method": "upsert",
    "module": "success_stories",
    "permission": "can_edit",
    "allowedFields": [
      "created_by",
      "field_name",
      "is_published",
      "language",
      "reviewed",
      "source_id",
      "source_type",
      "status",
      "translated_value",
      "updated_at",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [],
    "returnFields": []
  },
  "pr116_trash_announcements_move": {
    "kind": "trash",
    "itemType": "announcements",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_contact_messages_move": {
    "kind": "trash",
    "itemType": "contact_messages",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_faqs_move": {
    "kind": "trash",
    "itemType": "faqs",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_gallery_move": {
    "kind": "trash",
    "itemType": "gallery",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_jobs_move": {
    "kind": "trash",
    "itemType": "jobs",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_media_assets_move": {
    "kind": "trash",
    "itemType": "media_assets",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_pages_content_move": {
    "kind": "trash",
    "itemType": "pages_content",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_partners_move": {
    "kind": "trash",
    "itemType": "partners",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_programs_move": {
    "kind": "trash",
    "itemType": "programs",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_reviews_move": {
    "kind": "trash",
    "itemType": "reviews",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_sections_move": {
    "kind": "trash",
    "itemType": "sections",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_service_requests_move": {
    "kind": "trash",
    "itemType": "service_requests",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_trash_success_stories_move": {
    "kind": "trash",
    "itemType": "success_stories",
    "module": "trash",
    "permission": "can_create",
    "allowedFields": [
      "itemType",
      "recordId",
      "title",
      "record",
      "reason"
    ]
  },
  "pr116_visual_experience_page_entity_visual_experience_settings_insert": {
    "kind": "entity",
    "table": "visual_experience_settings",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "animated_cards",
      "apply_to_public",
      "approved_at",
      "approved_by",
      "background",
      "cards",
      "cards_scope",
      "created_by",
      "glass",
      "glow",
      "motion",
      "notes",
      "preset_name",
      "status",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id, preset_name, background, motion, glow, glass, animated_cards, cards_scope, cards, notes, status, apply_to_public, approved_by, approved_at, created_at, updated_at"
    ],
    "returnFields": [
      "id",
      "preset_name",
      "background",
      "motion",
      "glow",
      "glass",
      "animated_cards",
      "cards_scope",
      "cards",
      "notes",
      "status",
      "apply_to_public",
      "approved_by",
      "approved_at",
      "created_at",
      "updated_at"
    ]
  },
  "pr116_visual_experience_page_entity_visual_experience_settings_update": {
    "kind": "entity",
    "table": "visual_experience_settings",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "animated_cards",
      "apply_to_public",
      "approved_at",
      "approved_by",
      "background",
      "cards",
      "cards_scope",
      "glass",
      "glow",
      "motion",
      "notes",
      "preset_name",
      "status",
      "updated_by"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [
      "id, preset_name, background, motion, glow, glass, animated_cards, cards_scope, cards, notes, status, apply_to_public, approved_by, approved_at, created_at, updated_at"
    ],
    "returnFields": [
      "id",
      "preset_name",
      "background",
      "motion",
      "glow",
      "glass",
      "animated_cards",
      "cards_scope",
      "cards",
      "notes",
      "status",
      "apply_to_public",
      "approved_by",
      "approved_at",
      "created_at",
      "updated_at"
    ]
  },
  "pr116_white_label_page_entity_white_label_projects_insert": {
    "kind": "entity",
    "table": "white_label_projects",
    "method": "insert",
    "module": "settings",
    "permission": "can_create",
    "allowedFields": [
      "accent_color",
      "agency_name",
      "checklist",
      "created_by",
      "default_language",
      "domain",
      "enabled_languages",
      "notes",
      "owner_email",
      "owner_name",
      "package_type",
      "primary_color",
      "status",
      "updated_by"
    ],
    "allowedFilters": [],
    "allowedSelects": [
      "id, agency_name, owner_name, owner_email, domain, default_language, enabled_languages, primary_color, accent_color, package_type, status, notes, checklist, is_active, created_at, updated_at"
    ],
    "returnFields": [
      "id",
      "agency_name",
      "owner_name",
      "owner_email",
      "domain",
      "default_language",
      "enabled_languages",
      "primary_color",
      "accent_color",
      "package_type",
      "status",
      "notes",
      "checklist",
      "is_active",
      "created_at",
      "updated_at"
    ]
  },
  "pr116_white_label_page_entity_white_label_projects_update": {
    "kind": "entity",
    "table": "white_label_projects",
    "method": "update",
    "module": "settings",
    "permission": "can_edit",
    "allowedFields": [
      "accent_color",
      "agency_name",
      "checklist",
      "default_language",
      "domain",
      "enabled_languages",
      "notes",
      "owner_email",
      "owner_name",
      "package_type",
      "primary_color",
      "status",
      "updated_by"
    ],
    "allowedFilters": [
      "id"
    ],
    "allowedSelects": [
      "id, agency_name, owner_name, owner_email, domain, default_language, enabled_languages, primary_color, accent_color, package_type, status, notes, checklist, is_active, created_at, updated_at"
    ],
    "returnFields": [
      "id",
      "agency_name",
      "owner_name",
      "owner_email",
      "domain",
      "default_language",
      "enabled_languages",
      "primary_color",
      "accent_color",
      "package_type",
      "status",
      "notes",
      "checklist",
      "is_active",
      "created_at",
      "updated_at"
    ]
  }
} as const satisfies Record<string, Pr116AdminActionContract>;

export type Pr116GeneratedAdminAction = keyof typeof PR116_ADMIN_ACTION_CONTRACTS;
