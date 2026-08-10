"use client";


import { adminBoundaryMutation, adminStorageMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";
import {
  SITE_VISUAL_SCOPES,
  siteVisualScopeLabel,
  type SiteVisualMediaKind,
  type SiteVisualScope,
} from "@/lib/siteVisualMedia";

type Status = "draft" | "review" | "approved" | "published" | "disabled" | "archived";
type Slot = "desktop_url" | "desktop_fallback_url" | "mobile_url" | "mobile_fallback_url" | "poster_url";
type Row = {
  id: number; name: string | null; file_type: SiteVisualMediaKind | null;
  page_slug: SiteVisualScope | null; status: Status | null; usage_context: string | null;
  desktop_url: string | null; desktop_fallback_url: string | null;
  mobile_url: string | null; mobile_fallback_url: string | null; poster_url: string | null;
  alt_text: string | null; opacity: number | null; dimming: number | null;
  overlay_strength: number | null; blur_px: number | null; focal_position: string | null;
  autoplay: boolean | null; loop: boolean | null; publish_at: string | null;
  unpublish_at: string | null; is_active: boolean | null;
};

type Form = {
  name: string; fileType: SiteVisualMediaKind; pageSlug: SiteVisualScope; status: Status;
  usage: string; alt: string; desktop: string; desktopFallback: string; mobile: string;
  mobileFallback: string; poster: string; opacity: number; dimming: number; overlay: number;
  blur: number; focal: string; autoplay: boolean; loop: boolean; publishAt: string; unpublishAt: string;
};

const BUCKET = "media-library";
const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;
const labels: Record<Status, string> = {
  draft: "مسودة", review: "قيد المراجعة", approved: "معتمد", published: "منشور",
  disabled: "معطّل", archived: "مؤرشف",
};
const emptyForm: Form = {
  name: "", fileType: "cinematic_video", pageSlug: "home", status: "draft",
  usage: "خلفية الصفحة", alt: "", desktop: "", desktopFallback: "", mobile: "",
  mobileFallback: "", poster: "", opacity: 1, dimming: .36, overlay: .48, blur: 0,
  focal: "center center", autoplay: true, loop: true, publishAt: "", unpublishAt: "",
};
const fields = "id,name,file_type,page_slug,status,usage_context,desktop_url,desktop_fallback_url,mobile_url,mobile_fallback_url,poster_url,alt_text,opacity,dimming,overlay_strength,blur_px,focal_position,autoplay,loop,publish_at,unpublish_at,is_active";

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function iso(value: string) { return value ? new Date(value).toISOString() : null; }
function safeSlug(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "asset"; }
function signature(bytes: Uint8Array, expected: number[]) { return expected.every((v, i) => bytes[i] === v); }
async function inspect(file: File) {
  const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (signature(b, [0xff,0xd8,0xff])) return { mime: "image/jpeg", ext: "jpg", video: false };
  if (signature(b, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) return { mime: "image/png", ext: "png", video: false };
  if (String.fromCharCode(...b.slice(0,4)) === "RIFF" && String.fromCharCode(...b.slice(8,12)) === "WEBP") return { mime: "image/webp", ext: "webp", video: false };
  if (String.fromCharCode(...b.slice(4,8)) === "ftyp" && ["avif","avis"].includes(String.fromCharCode(...b.slice(8,12)))) return { mime: "image/avif", ext: "avif", video: false };
  if (signature(b, [0x1a,0x45,0xdf,0xa3])) return { mime: "video/webm", ext: "webm", video: true };
  if (String.fromCharCode(...b.slice(4,8)) === "ftyp") return { mime: "video/mp4", ext: "mp4", video: true };
  return null;
}
function fromRow(row: Row): Form {
  return {
    name: row.name || "", fileType: row.file_type || "cinematic_video", pageSlug: row.page_slug || "home",
    status: row.status || "draft", usage: row.usage_context || "خلفية الصفحة", alt: row.alt_text || "",
    desktop: row.desktop_url || "", desktopFallback: row.desktop_fallback_url || "", mobile: row.mobile_url || "",
    mobileFallback: row.mobile_fallback_url || "", poster: row.poster_url || "", opacity: row.opacity ?? 1,
    dimming: row.dimming ?? .36, overlay: row.overlay_strength ?? .48, blur: row.blur_px ?? 0,
    focal: row.focal_position || "center center", autoplay: row.autoplay !== false, loop: row.loop !== false,
    publishAt: localDate(row.publish_at), unpublishAt: localDate(row.unpublish_at),
  };
}

export default function AdminCinematicMediaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Partial<Record<Slot, File>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const result = await supabase.from("media").select(fields).in("file_type", ["cinematic_video","background_image","texture"]).order("updated_at", { ascending: false });
    if (result.error) {
      setSchemaReady(false); setRows([]);
      setError("تعذر تحميل إعدادات الوسائط السينمائية. تحقق من إعدادات النظام والصلاحيات.");
      return;
    }
    setSchemaReady(true); setRows((result.data || []) as Row[]);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const access = await requireAdminModuleAccess("media");
      if (!active) return;
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }
      setAdminEmail(access.profile.email || access.user?.email || "");
      setReady(true); void load();
    })();
    return () => { active = false; };
  }, [load, router]);

  async function upload(slot: Slot, file: File) {
    if (!supabase) throw new Error("التخزين غير متاح.");
    const detected = await inspect(file);
    if (!detected) throw new Error("نوع الملف أو توقيعه الداخلي غير مسموح.");
    const poster = slot === "poster_url";
    const expectedVideo = form.fileType === "cinematic_video" && !poster;
    if (detected.video !== expectedVideo) throw new Error(expectedVideo ? "هذا الحقل يحتاج WebM أو MP4." : "هذا الحقل يحتاج صورة آمنة.");
    if ((detected.video && file.size > VIDEO_MAX) || (!detected.video && file.size > IMAGE_MAX)) throw new Error(detected.video ? "حجم الفيديو يتجاوز 25MB." : "حجم الصورة يتجاوز 5MB.");
    if ((slot === "desktop_fallback_url" || slot === "mobile_fallback_url") && detected.mime !== "video/mp4") throw new Error("الفيديو البديل يجب أن يكون MP4.");
    const path = `pr5/${safeSlug(form.pageSlug)}/${safeSlug(slot)}/${Date.now()}-${crypto.randomUUID()}.${detected.ext}`;
    const result = await adminStorageMutation("pr116_media_cinematic_page_storage_media_library_upload", [path, file, { cacheControl: "31536000", contentType: detected.mime, upsert: false }]);
    if (result.error) throw new Error("تعذر رفع الملف إلى مكتبة الوسائط.");
    return supabase.storage.from("media-library").getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    if (!supabase || !schemaReady || busy) return;
    setError(""); setMessage("");
    if (!form.name.trim()) { setError("اكتب اسماً واضحاً للأصل."); return; }
    if (form.publishAt && form.unpublishAt && new Date(form.unpublishAt) <= new Date(form.publishAt)) { setError("إيقاف النشر يجب أن يكون بعد بدء النشر."); return; }
    setBusy(true);
    try {
      const urls: Record<Slot, string> = {
        desktop_url: form.desktop, desktop_fallback_url: form.desktopFallback,
        mobile_url: form.mobile, mobile_fallback_url: form.mobileFallback, poster_url: form.poster,
      };
      for (const slot of Object.keys(uploads) as Slot[]) {
        const file = uploads[slot]; if (file) urls[slot] = await upload(slot, file);
      }
      if (!urls.desktop_url && !urls.mobile_url) throw new Error("أضف أصل سطح المكتب أو الهاتف واحداً على الأقل.");
      if (form.fileType === "cinematic_video" && form.status === "published" && !urls.poster_url) throw new Error("الفيديو المنشور يحتاج صورة ثابتة لضمان العرض البديل السريع.");
      const payload = {
        name: form.name.trim(), file_url: urls.desktop_url || urls.mobile_url || urls.poster_url,
        file_type: form.fileType, category: "cinematic_visual", alt_text: form.alt.trim(), page_slug: form.pageSlug,
        is_active: form.status !== "disabled" && form.status !== "archived", uploaded_by: adminEmail || null,
        status: form.status, usage_context: form.usage.trim() || "خلفية الصفحة", ...urls,
        opacity: form.opacity, dimming: form.dimming, overlay_strength: form.overlay, blur_px: form.blur,
        focal_position: form.focal, autoplay: form.autoplay, loop: form.loop,
        publish_at: iso(form.publishAt), unpublish_at: iso(form.unpublishAt), updated_at: new Date().toISOString(),
      };
      const result = editing ? await adminBoundaryMutation("pr116_media_cinematic_page_entity_media_update", { values: payload, filters: [{ op: "eq", field: "id", value: editing }], select: undefined, returnMode: "many", options: undefined }) : await adminBoundaryMutation("pr116_media_cinematic_page_entity_media_insert", { values: payload, filters: [], select: undefined, returnMode: "many", options: undefined });
      if (result.error) throw new Error("تعذر حفظ الأصل. راجع الصلاحيات ثم أعد المحاولة.");
      setMessage(form.status === "published" ? "تم الحفظ والنشر وفق الجدولة." : "تم الحفظ دون نشره للزوار.");
      setEditing(null); setForm(emptyForm); setUploads({}); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذر الحفظ."); }
    finally { setBusy(false); }
  }

  async function archive(row: Row) {
    if (!supabase) return;
    if (row.status === "published") { setError("الأصل منشور ومستخدم. عطّله واحفظ بديلاً قبل الأرشفة."); return; }
    if (!window.confirm("أرشفة الأصل مع إبقاء ملفات التخزين لمنع كسر الروابط؟")) return;
    const result = await adminBoundaryMutation("pr116_media_cinematic_page_entity_media_update", { values: { status: "archived", is_active: false, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "id", value: row.id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) setError("تعذر أرشفة الأصل."); else { setMessage("تمت الأرشفة الآمنة."); await load(); }
  }

  async function safeDelete(row: Row) {
    if (!supabase) return;
    if (row.status !== "archived" || row.is_active !== false) { setError("الحذف الآمن متاح فقط للأصل المؤرشف والمعطّل."); return; }
    if (!window.confirm("حذف سجل الأصل المؤرشف؟ ستبقى الملفات في التخزين كنسخة أمان.")) return;
    const result = await adminBoundaryMutation("pr116_media_cinematic_page_entity_media_delete", { values: undefined, filters: [{ op: "eq", field: "id", value: row.id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) setError("تعذر حذف السجل."); else { setMessage("تم حذف السجل بأمان مع إبقاء ملفات التخزين."); await load(); }
  }

  if (!ready) return <main dir="rtl" className="min-h-screen bg-[#050008] p-8 text-center text-white">جاري التحقق من صلاحيات إدارة الوسائط...</main>;

  return (
    <main dir="rtl" className="min-h-screen bg-[#050008] p-4 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-3xl font-black md:text-5xl">إدارة الوسائط السينمائية</h1><p className="mt-3 max-w-3xl leading-8 text-white/60">إدارة خلفيات الصفحات، النسخ المخصصة للشاشات، الصور البديلة، الجدولة والتحكم البصري.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/media" className="rounded-full border border-white/10 px-5 py-3 text-sm font-black">مكتبة الصور</Link><Link href="/admin/visual-experience" className="rounded-full border border-purple-300/20 px-5 py-3 text-sm font-black">التجربة البصرية</Link></div>
        </header>
        {!schemaReady && <div className="mb-6 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 text-yellow-100">إعدادات الوسائط السينمائية غير متاحة حاليًا. سيستمر الموقع باستخدام الخلفية الآمنة.</div>}
        {(error || message) && <div className={`mb-6 rounded-3xl border p-5 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>{error || message}</div>}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[.04] p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{editing ? "تعديل أصل بصري" : "إضافة أصل بصري"}</h2>{editing && <button onClick={() => { setEditing(null); setForm(emptyForm); setUploads({}); }} className="rounded-full border border-white/10 px-4 py-2 text-sm">إلغاء</button>}</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Input label="اسم الأصل" value={form.name} onChange={(name) => setForm({ ...form, name })} />
            <Select label="الصفحة" value={form.pageSlug} onChange={(pageSlug) => setForm({ ...form, pageSlug: pageSlug as SiteVisualScope })}>{SITE_VISUAL_SCOPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
            <Select label="النوع" value={form.fileType} onChange={(fileType) => setForm({ ...form, fileType: fileType as SiteVisualMediaKind })}><option value="cinematic_video">فيديو سينمائي</option><option value="background_image">صورة خلفية</option><option value="texture">نسيج بصري</option></Select>
            <Select label="الحالة" value={form.status} onChange={(status) => setForm({ ...form, status: status as Status })}>{(Object.keys(labels) as Status[]).map((s) => <option key={s} value={s}>{labels[s]}</option>)}</Select>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><Input label="سياق الاستخدام" value={form.usage} onChange={(usage) => setForm({ ...form, usage })} /><Input label="النص البديل" value={form.alt} onChange={(alt) => setForm({ ...form, alt })} /></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Upload label="ملف سطح المكتب" accept={form.fileType === "cinematic_video" ? "video/webm,video/mp4" : "image/jpeg,image/png,image/webp,image/avif"} onFile={(file) => setUploads({ ...uploads, desktop_url: file })} />
            <Upload label="فيديو بديل لسطح المكتب" accept="video/mp4" disabled={form.fileType !== "cinematic_video"} onFile={(file) => setUploads({ ...uploads, desktop_fallback_url: file })} />
            <Upload label="ملف الهاتف" accept={form.fileType === "cinematic_video" ? "video/webm,video/mp4" : "image/jpeg,image/png,image/webp,image/avif"} onFile={(file) => setUploads({ ...uploads, mobile_url: file })} />
            <Upload label="فيديو بديل للهاتف" accept="video/mp4" disabled={form.fileType !== "cinematic_video"} onFile={(file) => setUploads({ ...uploads, mobile_fallback_url: file })} />
            <Upload label="الصورة الثابتة" accept="image/jpeg,image/png,image/webp,image/avif" onFile={(file) => setUploads({ ...uploads, poster_url: file })} />
          </div>
          <p className="mt-3 text-xs text-white/45">الصور ≤5MB، الفيديو ≤25MB. JPEG/PNG/WebP/AVIF/WebM/MP4 فقط. SVG ممنوع.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Range label="الشفافية" value={form.opacity} max={1} step={.05} onChange={(opacity) => setForm({ ...form, opacity })} /><Range label="التعتيم" value={form.dimming} max={.9} step={.05} onChange={(dimming) => setForm({ ...form, dimming })} /><Range label="طبقة القراءة" value={form.overlay} max={.9} step={.05} onChange={(overlay) => setForm({ ...form, overlay })} /><Range label="الضبابية" value={form.blur} max={24} step={1} onChange={(blur) => setForm({ ...form, blur })} /></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3"><Select label="موضع التركيز" value={form.focal} onChange={(focal) => setForm({ ...form, focal })}><option value="center center">الوسط</option><option value="center top">أعلى</option><option value="center bottom">أسفل</option><option value="left center">يسار</option><option value="right center">يمين</option></Select><Input label="بدء النشر" type="datetime-local" value={form.publishAt} onChange={(publishAt) => setForm({ ...form, publishAt })} /><Input label="إيقاف النشر" type="datetime-local" value={form.unpublishAt} onChange={(unpublishAt) => setForm({ ...form, unpublishAt })} /></div>
          <div className="mt-4 flex flex-wrap gap-3"><Check label="تشغيل تلقائي صامت" checked={form.autoplay} disabled={form.fileType !== "cinematic_video"} onChange={(autoplay) => setForm({ ...form, autoplay })} /><Check label="تكرار الفيديو" checked={form.loop} disabled={form.fileType !== "cinematic_video"} onChange={(loop) => setForm({ ...form, loop })} /></div>
          <div className="mt-6 flex justify-end"><button onClick={() => void save()} disabled={!schemaReady || busy} className="rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 px-7 py-3 font-black disabled:opacity-50">{busy ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة إلى المكتبة"}</button></div>
        </section>

        <section><h2 className="mb-4 text-2xl font-black">الأصول وربط الصفحات</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => <article key={row.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{row.name || "أصل بصري"}</h3><p className="mt-1 text-sm text-white/55">{row.page_slug ? siteVisualScopeLabel(row.page_slug) : "غير مربوط"}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs">{labels[row.status || "draft"]}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45"><div>سطح المكتب: {row.desktop_url ? "جاهز" : "—"}</div><div>الهاتف: {row.mobile_url ? "جاهز" : "يرث نسخة سطح المكتب"}</div><div>الصورة الثابتة: {row.poster_url ? "جاهزة" : "—"}</div><div>الجدولة: {row.publish_at ? "محددة" : "بدون"}</div></div><div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => { setEditing(row.id); setForm(fromRow(row)); setUploads({}); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full border border-purple-300/20 px-4 py-2 text-xs font-black">تعديل</button><button onClick={() => void archive(row)} className="rounded-full border border-red-300/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100">أرشفة آمنة</button>{row.status === "archived" && row.is_active === false && <button onClick={() => void safeDelete(row)} className="rounded-full border border-red-300/25 px-4 py-2 text-xs font-black text-red-100">حذف آمن للسجل</button>}</div></article>)}
        </div>{rows.length === 0 && <div className="rounded-3xl border border-white/10 p-8 text-center text-white/45">لا توجد أصول سينمائية بعد. سيستمر الموقع باستخدام الخلفية السينمائية الافتراضية.</div>}</section>
      </section>
    </main>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) { return <label className="grid gap-2 text-sm font-black text-white/70">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>; }
function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-black text-white/70">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-white">{children}</select></label>; }
function Range({ label, value, max, step, onChange }: { label: string; value: number; max: number; step: number; onChange: (v: number) => void }) { return <label className="grid gap-2 text-sm font-black text-white/70"><span className="flex justify-between"><span>{label}</span><span>{value}</span></span><input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) { return <label className="flex gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black"><input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />{label}</label>; }
function Upload({ label, accept, disabled, onFile }: { label: string; accept: string; disabled?: boolean; onFile: (file: File) => void }) { return <label className="grid min-h-28 gap-2 rounded-2xl border border-dashed border-white/15 p-4 text-xs text-white/60"><span className="font-black text-white/70">{label}</span><input type="file" accept={accept} disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); }} className="text-xs" /></label>; }
