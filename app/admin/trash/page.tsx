"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type TrashItem = Record<string, unknown>;
type FilterKey = "all" | "applications" | "programs" | "pages" | "services" | "content" | "other";
type Tone = "red" | "purple" | "blue" | "green" | "yellow" | "cyan" | "slate";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "applications", label: "طلبات" },
  { key: "programs", label: "برامج" },
  { key: "pages", label: "صفحات" },
  { key: "services", label: "خدمات" },
  { key: "content", label: "محتوى" },
  { key: "other", label: "أخرى" },
];

function getString(item: TrashItem, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير متوفر";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "بيانات غير قابلة للعرض";
  }
}

function getEntityType(item: TrashItem) {
  return getString(item, ["entity_type", "item_type", "table_name", "table", "module", "resource"], "other");
}

function getEntityLabel(item: TrashItem) {
  const entity = getEntityType(item);

  const labels: Record<string, string> = {
    agency_applications: "طلبات الانضمام",
    service_requests: "طلبات الخدمات",
    services: "الخدمات",
    programs: "البرامج",
    program_pages: "صفحات البرامج",
    pages: "الصفحات",
    sections: "الأقسام",
    media: "الوسائط",
    announcements: "الإعلانات",
    jobs: "الوظائف",
    job_applications: "طلبات الوظائف",
    reviews: "التقييمات",
    success_stories: "قصص النجاح",
    partners: "الشركاء",
    gallery_items: "المعرض",
    faqs: "الأسئلة الشائعة",
    knowledge_base: "مركز المعرفة",
    settings: "الإعدادات",
  };

  return labels[entity] || entity || "عنصر محذوف";
}

function getCategory(item: TrashItem): FilterKey {
  const entity = getEntityType(item).toLowerCase();

  if (entity.includes("application")) return "applications";
  if (entity.includes("program")) return "programs";
  if (entity.includes("page") || entity.includes("section")) return "pages";
  if (entity.includes("service")) return "services";

  if (
    ["review", "success", "partner", "gallery", "faq", "knowledge", "media", "announcement", "job"].some((word) =>
      entity.includes(word)
    )
  ) {
    return "content";
  }

  return "other";
}

function getTone(category: FilterKey): Tone {
  if (category === "applications") return "blue";
  if (category === "programs") return "purple";
  if (category === "pages") return "cyan";
  if (category === "services") return "green";
  if (category === "content") return "yellow";
  if (category === "other") return "slate";
  return "red";
}

function getTitle(item: TrashItem) {
  return getString(
    item,
    ["title", "name", "item_title", "entity_title", "label", "full_name", "request_code"],
    getEntityLabel(item)
  );
}

function getRecordId(item: TrashItem) {
  return getString(item, ["record_id", "entity_id", "item_id", "target_id", "original_id", "id"], "غير متوفر");
}

function getOriginalRecordId(item: TrashItem) {
  return getString(item, ["record_id", "entity_id", "item_id", "target_id", "original_id"], "");
}

function getTrashRowId(item: TrashItem) {
  return getString(item, ["id"], "");
}

function getDeletedBy(item: TrashItem) {
  return getString(
    item,
    ["deleted_by", "admin_email", "user_email", "actor_email", "created_by", "email", "user_id"],
    "غير محدد"
  );
}

function getDeletedAt(item: TrashItem) {
  return getString(item, ["deleted_at", "created_at", "updated_at", "timestamp", "date"], "");
}

function getTimeValue(item: TrashItem) {
  const value = getDeletedAt(item);
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function getPayload(item: TrashItem) {
  return item.data ?? item.payload ?? item.item_data ?? item.original_data ?? item.metadata ?? item.details ?? "";
}

function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;

  if (typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getRestorableTableName(item: TrashItem) {
  const entity = getEntityType(item).trim();

  const supportedTables: Record<string, string> = {
    agency_applications: "agency_applications",
    service_requests: "service_requests",
    programs: "programs",
    program_pages: "program_pages",
    pages: "pages",
    sections: "sections",
    media: "media",
    announcements: "announcements",
    jobs: "jobs",
    job_applications: "job_applications",
    reviews: "reviews",
    success_stories: "success_stories",
    partners: "partners",
    gallery_items: "gallery_items",
    faqs: "faqs",
    knowledge_base: "knowledge_base",
  };

  return supportedTables[entity] || "";
}

function buildRestorePayload(item: TrashItem) {
  const payload = parsePayload(getPayload(item)) || {};
  const originalRecordId = getOriginalRecordId(item);
  const restorePayload: Record<string, unknown> = { ...payload };

  [
    "deleted_at",
    "deleted_by",
    "restored_at",
    "restored_by",
    "trash_id",
    "entity_type",
    "table_name",
    "item_type",
    "payload",
    "data",
    "metadata",
    "details",
  ].forEach((key) => {
    delete restorePayload[key];
  });

  if (originalRecordId && !restorePayload.id) {
    const numericId = Number(originalRecordId);
    restorePayload.id = Number.isNaN(numericId) ? originalRecordId : numericId;
  }

  if ("is_active" in restorePayload) restorePayload.is_active = true;
  if ("is_visible" in restorePayload) restorePayload.is_visible = true;

  if (restorePayload.status === "deleted" || restorePayload.status === "archived") {
    restorePayload.status = "published";
  }

  if ("updated_at" in restorePayload) {
    restorePayload.updated_at = new Date().toISOString();
  }

  return restorePayload;
}

export default function AdminTrashPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restoringId, setRestoringId] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("trash");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }

      if (access.profile.role === "program_admin") {
        setAdminEmail(access.profile.email || access.user?.email || "");
        setIsForbidden(true);
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadTrashItems();
  }, [isAuthorized]);

  async function loadTrashItems() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setMessage("");
    setIsLoading(true);

    const { data, error: trashError } = await supabase
      .from("trash_items")
      .select("*")
      .limit(120);

    setIsLoading(false);

    if (trashError) {
      setError("تعذر تحميل سلة المحذوفات. يرجى التأكد من إعدادات جدول trash_items.");
      return;
    }

    const sortedItems = ((data || []) as TrashItem[])
      .slice()
      .sort((first, second) => getTimeValue(second) - getTimeValue(first));

    setItems(sortedItems);
  }

  async function restoreTrashItem(item: TrashItem) {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const tableName = getRestorableTableName(item);
    const trashRowId = getTrashRowId(item);
    const originalRecordId = getOriginalRecordId(item);
    const restoreKey = trashRowId || originalRecordId || getRecordId(item);
    const restorePayload = buildRestorePayload(item);

    if (!tableName) {
      setError("هذا النوع من العناصر غير مدعوم للاسترجاع الآمن حالياً.");
      return;
    }

    if (!restorePayload.id) {
      setError("لا يمكن الاسترجاع لأن رقم العنصر الأصلي غير واضح داخل سجل السلة.");
      return;
    }

    const confirmed = window.confirm(`هل تريد استرجاع هذا العنصر إلى جدول ${tableName}؟`);

    if (!confirmed) return;

    setError("");
    setMessage("");
    setRestoringId(restoreKey);

    const { error: restoreError } = await supabase
      .from(tableName)
      .upsert(restorePayload);

    if (restoreError) {
      setRestoringId("");
      setError(`تعذر استرجاع العنصر: ${restoreError.message}`);
      return;
    }

    if (trashRowId) {
      const { error: removeTrashError } = await supabase
        .from("trash_items")
        .delete()
        .eq("id", trashRowId);

      if (removeTrashError) {
        setRestoringId("");
        setError(
          "تم استرجاع العنصر، لكن تعذر حذف سجل السلة. يمكنك تحديث الصفحة أو حذفه لاحقاً من Supabase."
        );
        await loadTrashItems();
        return;
      }
    }

    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action: "restore_trash_item",
      entity_type: tableName,
      entity_id: String(restorePayload.id),
      old_data: JSON.stringify(item),
      new_data: JSON.stringify(restorePayload),
      ip_address: "",
    });

    setRestoringId("");
    await loadTrashItems();
    setMessage("تم استرجاع العنصر بنجاح وحذف سجلّه من السلة.");
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const category = getCategory(item);
      const matchesFilter = filter === "all" || category === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [getTitle(item), getEntityLabel(item), getRecordId(item), getDeletedBy(item), formatValue(getPayload(item))]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [items, filter, search]);

  const applicationsCount = items.filter((item) => getCategory(item) === "applications").length;
  const programsCount = items.filter((item) => getCategory(item) === "programs").length;
  const contentCount = items.filter((item) => getCategory(item) === "content").length;
  const otherCount = items.filter((item) => getCategory(item) === "other").length;

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center">
          <div className="text-sm font-black tracking-[0.25em] text-red-100">صلاحيات محدودة</div>
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض سلة المحذوفات لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">
            سلة المحذوفات مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.
          </p>
          <p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75"
          >
            العودة إلى لوحة التحكم
          </Link>
        </section>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-red-400/25 bg-red-500/10 px-5 py-2 text-sm font-bold text-red-100">
              سلة المحذوفات
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Trash System</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              عرض العناصر التي تم نقلها إلى سلة المحذوفات مع إمكانية الاسترجاع الآمن للعناصر المدعومة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadTrashItems}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(248,113,113,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث السلة"}
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        <div className="mb-6 rounded-3xl border border-green-400/20 bg-green-500/10 p-5 leading-8 text-green-50/85">
          الاسترجاع الآمن مفعل الآن للعناصر التي تحتوي على بياناتها الأصلية داخل سجل السلة.
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="طلبات" value={applicationsCount} tone="blue" />
          <StatCard label="برامج" value={programsCount} tone="purple" />
          <StatCard label="محتوى" value={contentCount} tone="yellow" />
          <StatCard label="أخرى" value={otherCount} tone="slate" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <FilterButton
                key={item.key}
                active={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </FilterButton>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في سلة المحذوفات..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-red-300/50"
          />
        </div>

        <div className="grid gap-4">
          {filteredItems.length === 0 && !error && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد عناصر محذوفة مطابقة حالياً.
            </div>
          )}

          {filteredItems.map((item, index) => {
            const category = getCategory(item);
            const payload = getPayload(item);
            const restoreKey = getTrashRowId(item) || getOriginalRecordId(item) || getRecordId(item) || String(index);

            return (
              <article
                key={getString(item, ["id"], String(index))}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-red-400/40 hover:bg-red-500/10"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={getTone(category)}>{getEntityLabel(item)}</Badge>
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                        عنصر محفوظ في السلة
                      </span>
                    </div>

                    <h2 className="text-2xl font-black">{getTitle(item)}</h2>
                    <div className="mt-2 grid gap-2 text-sm text-white/55 md:grid-cols-3">
                      <div>رقم العنصر: <span className="text-white/80">{getRecordId(item)}</span></div>
                      <div>حُذف بواسطة: <span className="text-white/80">{getDeletedBy(item)}</span></div>
                      <div>التاريخ: <span className="text-white/80">{formatDate(getDeletedAt(item))}</span></div>
                    </div>

                    {payload !== "" && (
                      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-left text-xs leading-6 text-white/65" dir="ltr">
                        {formatValue(payload)}
                      </pre>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-3 lg:w-56">
                    <button
                      type="button"
                      onClick={() => restoreTrashItem(item)}
                      disabled={Boolean(restoringId)}
                      className="rounded-2xl border border-green-400/25 bg-green-500/10 px-4 py-3 text-sm font-black text-green-100 transition hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {restoringId === restoreKey ? "جاري الاسترجاع..." : "استرجاع العنصر"}
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center text-sm text-white/55">
                      {filters.find((entry) => entry.key === category)?.label || "أخرى"}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneSoftClasses(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white"
          : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"
      }
    >
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneSoftClasses(tone)}`}>
      {children}
    </span>
  );
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  };

  return classes[tone];
}
