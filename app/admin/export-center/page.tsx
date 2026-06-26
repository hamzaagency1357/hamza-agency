"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type ExportStatus = "available" | "protected";
type ExportFormat = "json" | "csv" | "xlsx";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";
type ExportRow = Record<string, unknown>;
type ZipEntry = { name: string; content: string };

type ExportSource = {
  title: string;
  description: string;
  module: string;
  table: string | null;
  formats: string[];
  status: ExportStatus;
  tone: Tone;
  href?: string;
};

const exportSources: ExportSource[] = [
  { title: "طلبات الخدمات", description: "تصدير طلبات الخدمات ومتابعة سجلاتها التشغيلية من جدول service_requests.", module: "service_requests", table: "service_requests", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "green", href: "/admin/service-requests" },
  { title: "طلبات الانضمام", description: "تصدير طلبات الانضمام حسب البرنامج والحالة والتاريخ من جدول agency_applications.", module: "applications", table: "agency_applications", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "purple", href: "/admin/applications" },
  { title: "طلبات الوظائف", description: "تنظيم تصدير طلبات الوظائف وسجلات المرشحين من جدول job_applications.", module: "job_applications", table: "job_applications", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "blue", href: "/admin/jobs" },
  { title: "البرامج", description: "تصدير بيانات البرامج الظاهرة في الموقع من جدول programs.", module: "programs", table: "programs", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "yellow", href: "/admin/programs" },
  { title: "الشركاء", description: "تصدير بيانات الشركاء المنشورين من جدول partners.", module: "partners", table: "partners", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "yellow", href: "/admin/partners" },
  { title: "التقييمات", description: "تصدير ملفات منظمة للمراجعات المنشورة من جدول reviews.", module: "reviews", table: "reviews", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "cyan", href: "/admin/reviews" },
  { title: "قصص النجاح", description: "تصدير قصص النجاح المنشورة من جدول success_stories.", module: "success_stories", table: "success_stories", formats: ["JSON", "CSV", "Excel (.xlsx)"], status: "available", tone: "cyan", href: "/admin/success-stories" },
  { title: "إعدادات النظام", description: "تصدير إعدادات النظام الحساسة غير مفعّل من Export Center. استخدم Backup System عند الحاجة وبحذر.", module: "settings", table: null, formats: ["محمي"], status: "protected", tone: "red", href: "/admin/settings" },
];

const exportPageSize = 1000;
const maxExportPages = 20;

const fieldLabels: Record<string, string> = {
  id: "المعرّف",
  application_code: "رمز طلب الانضمام",
  request_code: "رمز طلب الخدمة",
  tracking_code: "رمز التتبع",
  status: "الحالة",
  full_name: "الاسم الكامل",
  name: "الاسم",
  email: "البريد الإلكتروني",
  phone: "رقم الهاتف",
  whatsapp: "رقم واتساب",
  country: "الدولة",
  city: "المدينة",
  program_id: "معرّف البرنامج",
  program_name: "اسم البرنامج",
  platform: "المنصة",
  service_type: "نوع الخدمة",
  job_id: "معرّف الوظيفة",
  job_title: "عنوان الوظيفة",
  title: "العنوان",
  slug: "الرابط المختصر",
  rating: "التقييم",
  is_published: "منشور",
  is_active: "مفعّل",
  is_visible: "ظاهر",
  sort_order: "ترتيب العرض",
  created_at: "تاريخ الإنشاء",
  updated_at: "تاريخ التحديث",
  message: "الرسالة",
  notes: "ملاحظات الإدارة",
  admin_notes: "ملاحظات الإدارة",
};

function getStatusLabel(status: ExportStatus) {
  return status === "protected" ? "محمي بالصلاحيات" : "تصدير فعلي متاح";
}

function formatDateForFileName() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function safeSpreadsheetText(value: unknown) {
  const text = stringifyCell(value);
  return /^[=+@-]/.test(text) ? `'${text}` : text;
}

function csvEscape(value: unknown) {
  return `"${stringifyCell(value).replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: ExportRow[]) {
  if (!rows.length) return "";
  const headers = getHeaders(rows);
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  return `\uFEFF${lines.join("\n")}`;
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadBinaryFile(fileName: string, content: Uint8Array, type: string) {
  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);
  const blob = new Blob([buffer], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function getHeaders(rows: ExportRow[]) {
  const fields = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => fields.add(key)));
  return Array.from(fields);
}

function excelColumn(index: number) {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function uint16(value: number) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function uint32(value: number) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function combine(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(new ArrayBuffer(length));
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.name);
    const content = encoder.encode(entry.content);
    const checksum = crc32(content);
    const local = combine([
      uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(content.length), uint32(content.length), uint16(name.length), uint16(0), name, content,
    ]);
    localParts.push(local);
    centralParts.push(combine([
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(content.length), uint32(content.length), uint16(name.length), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), name,
    ]));
    offset += local.length;
  });

  const central = combine(centralParts);
  const ending = combine([uint32(0x06054b50), uint16(0), uint16(0), uint16(entries.length), uint16(entries.length), uint32(central.length), uint32(offset), uint16(0)]);
  return combine([...localParts, central, ending]);
}

function createWorkbook(sourceTitle: string, rows: ExportRow[]) {
  const headers = getHeaders(rows);
  const sheetName = (sourceTitle.replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Export");
  const table = headers.length ? [[...headers.map((header) => fieldLabels[header] || header.replace(/_/g, " "))], ...rows.map((row) => headers.map((header) => row[header]))] : [["لا توجد بيانات متاحة للتصدير."]];
  const lastColumn = excelColumn(Math.max(table[0].length - 1, 0));
  const widths = table[0].map((_, column) => Math.max(14, Math.min(42, table.reduce((longest, row) => Math.max(longest, safeSpreadsheetText(row[column]).length), 0) + 2)));
  const sheetRows = table.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const cell = `${excelColumn(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${cell}"><v>${value}</v></c>`;
      if (typeof value === "boolean") return `<c r="${cell}" t="b"><v>${value ? 1 : 0}</v></c>`;
      return `<c r="${cell}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safeSpreadsheetText(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const filter = headers.length ? `<autoFilter ref="A1:${lastColumn}${table.length}"/>` : "";

  return createZip([
    { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: "xl/worksheets/sheet1.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columns}</cols><sheetData>${sheetRows}</sheetData>${filter}</worksheet>` },
  ]);
}

async function fetchTableRows(table: string) {
  if (!supabase) return { rows: [] as ExportRow[], error: "الاتصال بقاعدة البيانات غير مفعل." };
  const rows: ExportRow[] = [];
  for (let page = 0; page < maxExportPages; page += 1) {
    const from = page * exportPageSize;
    const { data, error } = await supabase.from(table).select("*").range(from, from + exportPageSize - 1);
    if (error) return { rows, error: error.message };
    const pageRows = (data || []) as ExportRow[];
    rows.push(...pageRows);
    if (pageRows.length < exportPageSize) break;
  }
  return { rows, error: null as string | null };
}

export default function AdminExportCenterPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [search, setSearch] = useState("");
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("export_center");
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

  const filteredSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exportSources;
    return exportSources.filter((source) => [source.title, source.description, source.module, source.formats.join(" "), getStatusLabel(source.status)].join(" ").toLowerCase().includes(query));
  }, [search]);

  const availableCount = exportSources.filter((source) => source.status === "available").length;
  const protectedCount = exportSources.filter((source) => source.status === "protected").length;

  async function exportSource(source: ExportSource, format: ExportFormat) {
    setMessage("");
    setError("");
    if (source.status === "protected" || !source.table) {
      setError("هذا المصدر محمي ولا يتم تصديره من Export Center.");
      return;
    }
    if (!window.confirm(`سيتم تصدير ${source.title}. قد يحتوي الملف بيانات تشغيلية أو معلومات تواصل. احفظ الملف في مكان آمن ولا تشاركه علناً. هل تريد المتابعة؟`)) return;
    setActiveExport(`${source.module}-${format}`);
    const { rows, error: exportError } = await fetchTableRows(source.table);
    setActiveExport(null);
    if (exportError) {
      setError(`فشل تصدير ${source.title}: ${exportError}`);
      return;
    }
    const timestamp = formatDateForFileName();
    if (format === "json") {
      downloadTextFile(`hamza-export-${source.module}-${timestamp}.json`, JSON.stringify({ project: "HAMZA AGENCY", source: source.module, table: source.table, exported_at: new Date().toISOString(), exported_by: adminEmail, rows_count: rows.length, rows }, null, 2), "application/json;charset=utf-8");
      setMessage(`تم تصدير ${source.title} بصيغة JSON. عدد الصفوف: ${rows.length}.`);
      return;
    }
    if (format === "xlsx") {
      downloadBinaryFile(`hamza-export-${source.module}-${timestamp}.xlsx`, createWorkbook(source.title, rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      setMessage(`تم تصدير ${source.title} بصيغة Excel (.xlsx). عدد الصفوف: ${rows.length}.`);
      return;
    }
    downloadTextFile(`hamza-export-${source.module}-${timestamp}.csv`, rowsToCsv(rows), "text/csv;charset=utf-8");
    setMessage(`تم تصدير ${source.title} بصيغة CSV. عدد الصفوف: ${rows.length}.`);
  }

  if (isCheckingAuth) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">جاري التحقق من صلاحيات الإدارة...</div></main>;

  if (isForbidden) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10"><section className="mx-auto max-w-4xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center"><div className="text-sm font-black tracking-[0.25em] text-red-100">صلاحيات محدودة</div><h1 className="mt-3 text-3xl font-black">لا يمكن عرض مركز التصدير لهذا الحساب</h1><p className="mt-4 leading-8 text-white/60">مركز التصدير مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p><p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p><Link href="/admin" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75">العودة إلى لوحة التحكم</Link></section></main>;
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">مركز التصدير</div><h1 className="text-4xl font-black md:text-5xl">Export Center</h1><p className="mt-3 max-w-3xl leading-8 text-white/55">مركز تصدير فعلي للبيانات الإدارية بصيغ JSON وCSV وExcel الحقيقي (.xlsx)، مع اتجاه عربي وترويسات واضحة في ملف Excel.</p></div>
          <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">لوحة الإدارة</Link>
        </div>
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">حساب الإدارة: <span className="text-white">{adminEmail}</span></div>
        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 leading-8 text-yellow-50/85">ملفات التصدير قد تحتوي بيانات تشغيلية أو معلومات تواصل. احفظ الملفات في مكان آمن ولا ترفعها إلى GitHub أو أي مكان عام.</div>
        {(message || error) && <div className={`mb-6 rounded-3xl border p-5 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>{error || message}</div>}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><StatCard label="مصادر التصدير" value={exportSources.length} tone="purple" /><StatCard label="تصدير فعلي" value={availableCount} tone="green" /><StatCard label="الصيغ الحالية" value={3} tone="blue" /><StatCard label="محمي" value={protectedCount} tone="red" /></div>
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث حسب القسم أو صيغة التصدير..." className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/40" /></section>
        <section className="grid gap-5 lg:grid-cols-2">
          {filteredSources.map((source) => {
            const isProtected = source.status === "protected" || !source.table;
            return <article key={source.module} className={`rounded-[2rem] border p-5 ${toneClass(source.tone)}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">{getStatusLabel(source.status)}</div><h2 className="text-2xl font-black">{source.title}</h2><p className="mt-3 leading-8 opacity-75">{source.description}</p></div><div className="text-sm opacity-75 md:text-left" dir="ltr">{source.table || source.module}</div></div>
              <div className="mt-5 flex flex-wrap gap-2">{source.formats.map((format) => <span key={format} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-black">{format}</span>)}</div>
              <div className="mt-5 flex flex-wrap gap-3">
                {source.href && <Link href={source.href} className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white/75 transition hover:border-cyan-300/40 hover:text-white">فتح القسم</Link>}
                <ExportButton label="تصدير JSON" loading="تصدير JSON..." active={activeExport === `${source.module}-json`} disabled={isProtected || Boolean(activeExport)} onClick={() => exportSource(source, "json")} />
                <ExportButton label="تصدير CSV" loading="تصدير CSV..." active={activeExport === `${source.module}-csv`} disabled={isProtected || Boolean(activeExport)} onClick={() => exportSource(source, "csv")} />
                <ExportButton label="تصدير Excel" loading="تصدير Excel..." active={activeExport === `${source.module}-xlsx`} disabled={isProtected || Boolean(activeExport)} onClick={() => exportSource(source, "xlsx")} excel />
              </div>
            </article>;
          })}
        </section>
        {filteredSources.length === 0 && <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">لا توجد مصادر تصدير مطابقة للبحث.</div>}
      </section>
    </main>
  );
}

function ExportButton({ label, loading, active, disabled, onClick, excel = false }: { label: string; loading: string; active: boolean; disabled: boolean; onClick: () => void; excel?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`rounded-full border px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${excel ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-50 hover:border-cyan-200/60 hover:bg-cyan-500/25" : "border-white/10 bg-black/20 text-white/80 hover:border-cyan-300/40 hover:text-white"}`}>{active ? loading : label}</button>;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}><div className="text-sm font-bold opacity-75">{label}</div><div className="mt-2 text-4xl font-black" dir="ltr">{value}</div></div>;
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = { purple: "border-purple-400/20 bg-purple-500/10 text-purple-100", green: "border-green-400/20 bg-green-500/10 text-green-100", blue: "border-blue-400/20 bg-blue-500/10 text-blue-100", yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100", red: "border-red-400/20 bg-red-500/10 text-red-100", cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100" };
  return classes[tone];
}
