-- Checkpoint 1B compatibility fix.
-- The existing shared trigger referenced SLA-only fields before confirming that
-- the trigger row came from sla_events. That breaks user_sessions ->
-- security_alerts notification handling on the current Production schema.
-- Guarded for the bounded local contract, where this legacy project-wide trigger
-- is intentionally absent.

begin;

do $migration$
begin
  if to_regprocedure('private.emit_product_notification()') is not null then
    execute $function$
      create or replace function private.emit_product_notification()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        target_tenant uuid;
        target_user uuid;
        target_role text;
        event_name text;
        notification_title text;
        notification_message text;
        entity_kind text;
        entity_value text;
      begin
        if tg_table_name = 'task_assignments' then
          target_tenant := new.tenant_id;
          target_user := new.user_id;
          event_name := 'task.assigned:' || new.task_id || ':' || new.user_id;
          notification_title := 'مهمة جديدة';
          notification_message := 'تم تعيين مهمة جديدة لك داخل بوابة التشغيل.';
          entity_kind := 'task';
          entity_value := new.task_id::text;
        elsif tg_table_name = 'sla_events' then
          if new.event_type not in ('warning', 'breached') then
            return new;
          end if;
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'sla.' || new.event_type || ':' || new.id;
          notification_title := case when new.event_type = 'breached' then 'تجاوز SLA' else 'تنبيه SLA' end;
          notification_message := 'يوجد حدث SLA يحتاج متابعة فريق التشغيل.';
          entity_kind := 'sla_event';
          entity_value := new.id::text;
        elsif tg_table_name = 'privacy_requests' then
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'privacy.request.created:' || new.id;
          notification_title := 'طلب خصوصية جديد';
          notification_message := 'تم استلام طلب خصوصية جديد يحتاج التحقق والمعالجة.';
          entity_kind := 'privacy_request';
          entity_value := new.id::text;
        elsif tg_table_name = 'security_alerts' then
          target_tenant := new.tenant_id;
          target_user := new.user_id;
          event_name := 'security.alert:' || new.id;
          notification_title := 'تنبيه أمان';
          notification_message := 'تم تسجيل حدث أمان جديد على حسابك. راجع الأجهزة والجلسات.';
          entity_kind := 'security_alert';
          entity_value := new.id::text;
        elsif tg_table_name = 'incident_updates' then
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'incident.update:' || new.id;
          notification_title := 'تحديث حادثة تشغيلية';
          notification_message := 'تمت إضافة تحديث جديد إلى سجل الحوادث.';
          entity_kind := 'incident_update';
          entity_value := new.id::text;
        elsif tg_table_name = 'marketplace_orders' then
          target_tenant := new.tenant_id;
          target_user := new.client_user_id;
          event_name := 'marketplace.order.' || lower(new.status) || ':' || new.id;
          notification_title := 'تحديث طلب السوق';
          notification_message := 'تغيرت حالة طلبك داخل Marketplace.';
          entity_kind := 'marketplace_order';
          entity_value := new.id::text;
        else
          return new;
        end if;

        insert into public.notifications(
          title,
          message,
          type,
          is_read,
          recipient_role,
          recipient_user_id,
          notification_key,
          metadata,
          event_key,
          event_type,
          entity_type,
          entity_id,
          tenant_id,
          occurred_at
        ) values (
          notification_title,
          notification_message,
          'product_expansion',
          false,
          target_role,
          target_user,
          event_name,
          jsonb_build_object('entityType', entity_kind, 'entityId', entity_value),
          event_name,
          split_part(event_name, ':', 1),
          entity_kind,
          entity_value,
          target_tenant,
          now()
        )
        on conflict (tenant_id, event_key)
        where tenant_id is not null and event_key is not null
        do nothing;

        return new;
      end;
      $body$
    $function$;

    revoke execute on function private.emit_product_notification() from public, anon, authenticated;
  end if;
end;
$migration$;

commit;
