"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Invitation = {
  id: string;
  email: string;
  role: string;
  program_id: number | null;
  status: "invited" | "accepted" | "expired" | "revoked";
  expires_at: string;
  last_sent_at: string;
  send_count: number;
  created_at: string;
};

type Membership = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  program_id: number | null;
  permissions: Record<string, unknown>;
  mfa_required: boolean;
};

type Program = { id: number; name: string; slug: string };

const roles = ["creator", "client", "employee", "partner", "tenant_admin"];
const membershipStatuses = ["active", "suspended", "revoked"];

async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function api(path: string, init?: RequestInit) {
  const token = await accessToken();
  if (!token) throw new Error("unauthenticated");
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.code === "string" ? body.code : "request_failed");
  return body as Record<string, unknown>;
}

function fmt(value: string) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function TenantInvitationsConsole() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [draft, setDraft] = useState({ email: "", role: "creator", program_id: "", expires_in_days: "7" });
  const [permissions, setPermissions] = useState("{}");
  const [inviteUrl, setInviteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const activeInvitations = useMemo(() => invitations.filter((item) => item.status === "invited"), [invitations]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("unauthenticated");
      const membershipResult = await supabase
        .from("tenant_memberships")
        .select("tenant_id")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .in("role", ["super_admin", "tenant_admin"])
        .limit(1)
        .maybeSingle();
      const tenantId = membershipResult.data?.tenant_id;
      if (!tenantId) throw new Error("forbidden");
      const [inviteData, memberResult, programResult] = await Promise.all([
        api("/api/product-expansion/invitations"),
        supabase.from("tenant_memberships").select("id,user_id,role,status,program_id,permissions,mfa_required").eq("tenant_id", tenantId).order("created_at"),
        supabase.from("programs").select("id,name,slug").eq("tenant_id", tenantId).order("name"),
      ]);
      setInvitations(Array.isArray(inviteData.invitations) ? inviteData.invitations as Invitation[] : []);
      setMemberships(Array.isArray(memberResult.data) ? memberResult.data as Membership[] : []);
      setPrograms(Array.isArray(programResult.data) ? programResult.data as Program[] : []);
      const error = memberResult.error || programResult.error;
      if (error) setMessage(error.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createInvitation() {
    let parsedPermissions: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(permissions);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
      parsedPermissions = parsed;
    } catch {
      setMessage("صيغة الصلاحيات JSON غير صالحة.");
      return;
    }
    setBusy("create");
    setMessage("");
    setInviteUrl("");
    try {
      const result = await api("/api/product-expansion/invitations", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          email: draft.email,
          role: draft.role,
          program_id: draft.program_id || null,
          expires_in_days: Number(draft.expires_in_days),
          permissions: parsedPermissions,
        }),
      });
      setInviteUrl(String(result.invite_url || ""));
      setDraft({ email: "", role: "creator", program_id: "", expires_in_days: "7" });
      setPermissions("{}");
      setMessage("تم إنشاء الدعوة. انسخ الرابط وأرسله يدوياً حتى تفعيل مزود البريد أو WhatsApp لاحقاً.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "create_failed");
    } finally {
      setBusy("");
    }
  }

  async function invitationAction(action: "resend" | "revoke", invitationId: string) {
    setBusy(`${action}:${invitationId}`);
    setInviteUrl("");
    setMessage("");
    try {
      const result = await api("/api/product-expansion/invitations", {
        method: "POST",
        body: JSON.stringify({ action, invitation_id: invitationId, expires_in_days: 7 }),
      });
      if (action === "resend") setInviteUrl(String(result.invite_url || ""));
      setMessage(action === "resend" ? "تم إصدار رابط جديد وإبطال الرابط السابق." : "تم إلغاء الدعوة.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "action_failed");
    } finally {
      setBusy("");
    }
  }

  async function updateMembership(member: Membership, patch: Partial<Membership>) {
    const next = { ...member, ...patch };
    setBusy(`member:${member.id}`);
    setMessage("");
    try {
      await api("/api/product-expansion/invitations", {
        method: "POST",
        body: JSON.stringify({
          action: "manage_membership",
          membership_id: member.id,
          status: next.status,
          role: next.role,
          program_id: next.program_id,
          permissions: next.permissions,
        }),
      });
      setMessage("تم تحديث العضوية وتسجيل العملية في سجل التدقيق.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "membership_update_failed");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="p-8 text-white">جارٍ تحميل الدعوات والعضويات…</div>;

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-10 text-white" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-6">
          <p className="text-sm text-violet-200">Tenant Invitations & Memberships</p>
          <h1 className="mt-2 text-3xl font-black">الدعوات والعضويات التشغيلية</h1>
          <p className="mt-2 text-white/60">الرمز الخام يظهر مرة واحدة فقط. المخزن في قاعدة البيانات هو SHA-256 Hash، والمزود الخارجي يبقى معطلاً.</p>
          {message && <p role="status" className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}
        </header>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-2 lg:grid-cols-5">
          <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="user@example.com" className="min-h-11 rounded-xl bg-black/40 px-3" />
          <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
          <select value={draft.program_id} onChange={(event) => setDraft({ ...draft, program_id: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="">بدون برنامج</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select>
          <input type="number" min="1" max="30" value={draft.expires_in_days} onChange={(event) => setDraft({ ...draft, expires_in_days: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3" aria-label="مدة الدعوة بالأيام" />
          <button type="button" disabled={busy === "create"} onClick={() => void createInvitation()} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold disabled:opacity-50">{busy === "create" ? "جارٍ الإنشاء…" : "إنشاء الدعوة"}</button>
          <label className="md:col-span-2 lg:col-span-5">صلاحيات JSON<textarea value={permissions} onChange={(event) => setPermissions(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl bg-black/40 p-3 font-mono text-xs" /></label>
          {inviteUrl && <div className="md:col-span-2 lg:col-span-5 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4"><p className="text-sm text-emerald-100">رابط الدعوة الآمن — يظهر الآن فقط:</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input readOnly value={inviteUrl} dir="ltr" className="min-h-11 flex-1 rounded-xl bg-black/40 px-3 text-xs"/><button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)} className="rounded-xl bg-emerald-600 px-4">نسخ</button></div></div>}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">الدعوات ({activeInvitations.length} فعالة)</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr>{["البريد","الدور","الحالة","الانتهاء","الإرسال","الإجراءات"].map((label) => <th key={label} className="p-3 text-right text-violet-200">{label}</th>)}</tr></thead><tbody>{invitations.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="p-3" dir="ltr">{item.email}</td><td className="p-3">{item.role}</td><td className="p-3">{item.status}</td><td className="p-3">{fmt(item.expires_at)}</td><td className="p-3">{item.send_count}</td><td className="p-3"><div className="flex gap-2"><button type="button" disabled={item.status === "accepted" || item.status === "revoked" || Boolean(busy)} onClick={() => void invitationAction("resend", item.id)} className="rounded-lg bg-violet-600 px-3 py-2 disabled:opacity-40">إعادة إرسال</button><button type="button" disabled={item.status === "accepted" || item.status === "revoked" || Boolean(busy)} onClick={() => void invitationAction("revoke", item.id)} className="rounded-lg bg-red-700 px-3 py-2 disabled:opacity-40">إلغاء</button></div></td></tr>)}</tbody></table>{!invitations.length && <p className="py-10 text-center text-white/50">لا توجد دعوات بعد.</p>}</div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">العضويات</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead><tr>{["المستخدم","الدور","الحالة","البرنامج","MFA"].map((label) => <th key={label} className="p-3 text-right text-violet-200">{label}</th>)}</tr></thead><tbody>{memberships.map((member) => <tr key={member.id} className="border-t border-white/10"><td className="p-3 text-xs" dir="ltr">{member.user_id}</td><td className="p-3"><select value={member.role} disabled={Boolean(busy)} onChange={(event) => void updateMembership(member, { role: event.target.value })} className="rounded-lg bg-black/60 px-2 py-2">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></td><td className="p-3"><select value={member.status} disabled={Boolean(busy)} onChange={(event) => void updateMembership(member, { status: event.target.value })} className="rounded-lg bg-black/60 px-2 py-2">{membershipStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td><td className="p-3"><select value={member.program_id ?? ""} disabled={Boolean(busy)} onChange={(event) => void updateMembership(member, { program_id: event.target.value ? Number(event.target.value) : null })} className="rounded-lg bg-black/60 px-2 py-2"><option value="">بدون برنامج</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></td><td className="p-3">{member.mfa_required ? "مطلوب" : "غير مطلوب"}</td></tr>)}</tbody></table>{!memberships.length && <p className="py-10 text-center text-white/50">لا توجد عضويات.</p>}</div>
        </section>
      </div>
    </main>
  );
}
