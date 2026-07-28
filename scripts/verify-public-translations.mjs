import { readFile } from "node:fs/promises";

const dictionaryPath = new URL("../lib/i18n/siteRuntimeTranslations.ts", import.meta.url);
const source = await readFile(dictionaryPath, "utf8");

const entryPattern = /^\s*\["((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\],?\s*$/gm;
const entries = [];
let match;

while ((match = entryPattern.exec(source)) !== null) {
  entries.push({ source: match[1], en: match[2], tr: match[3] });
}

const errors = [];
const normalize = (value) => value.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
const arabicPattern = /[\u0600-\u06ff]/;
const bySource = new Map();
const approvedContextualDuplicates = new Set([
  "كيف تتم المتابعة؟",
  "التواصل عبر واتساب",
]);

if (entries.length < 300) {
  errors.push(`Expected at least 300 translation entries, found ${entries.length}.`);
}

for (const entry of entries) {
  const sourceText = normalize(entry.source);
  const en = normalize(entry.en);
  const tr = normalize(entry.tr);

  if (!sourceText || !en || !tr) {
    errors.push(`Empty translation field found for source: ${sourceText || "<empty>"}`);
    continue;
  }

  if (arabicPattern.test(en)) {
    errors.push(`English translation still contains Arabic text: ${sourceText}`);
  }

  if (arabicPattern.test(tr)) {
    errors.push(`Turkish translation still contains Arabic text: ${sourceText}`);
  }

  const existing = bySource.get(sourceText);
  const isConflictingDuplicate =
    existing && (existing.en !== en || existing.tr !== tr);

  if (isConflictingDuplicate && !approvedContextualDuplicates.has(sourceText)) {
    errors.push(`Conflicting duplicate translation for: ${sourceText}`);
  }

  // The runtime dictionary intentionally uses the last approved contextual value.
  bySource.set(sourceText, { en, tr });
}

const requiredSources = [
  "وكالة حمزة",
  "البرامج",
  "من نحن",
  "الخدمات",
  "الخدمات الرقمية",
  "طلب خدمة",
  "تتبع طلب خدمة",
  "تتبع طلب الانضمام",
  "الوظائف",
  "التقييمات",
  "قصص النجاح",
  "الشركاء والبرامج",
  "المعرض",
  "مركز المعرفة",
  "الأسئلة الشائعة",
  "اتصل بنا",
  "سياسة الخصوصية",
  "الشروط والأحكام",
  "سياسة الذكاء الاصطناعي",
  "دعم ذكي",
  "برنامج TikTok مخصص لصناع المحتوى الذين يريدون تطوير ظهورهم، تحسين جودة المحتوى، وفهم طريقة العمل داخل الوكالة بشكل احترافي.",
  "برنامج BIGO LIVE مناسب لصناع المحتوى المهتمين بالبث المباشر، بناء جمهور نشط، وتحسين طريقة الظهور والتفاعل داخل اللايف.",
  "برنامج Yaahlan يركز على بناء حضور اجتماعي وتفاعل مباشر مع الجمهور، مع دعم وكالة حمزة في المتابعة والتوجيه.",
  "برنامج Xena مناسب لصناع المحتوى الراغبين بالانضمام إلى برنامج منظم مع متابعة إدارية ودعم لتطوير الحساب.",
  "برنامج Catchii مناسب لصناع المحتوى المهتمين بالتواصل والترفيه وبناء حضور اجتماعي ضمن بيئة وكالة احترافية.",
];

for (const requiredSource of requiredSources) {
  if (!bySource.has(normalize(requiredSource))) {
    errors.push(`Required public translation is missing: ${requiredSource}`);
  }
}

const requiredRoutes = [
  "/",
  "/about",
  "/programs",
  "/services",
  "/digital-services",
  "/service-request",
  "/service-status",
  "/application-status",
  "/jobs",
  "/reviews",
  "/success-stories",
  "/partners",
  "/gallery",
  "/knowledge-center",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/ai-policy",
  "/ai-support",
];

for (const route of requiredRoutes) {
  const routeToken = route === "/" ? '"/": {' : `"${route}": {`;
  if (!source.includes(routeToken)) {
    errors.push(`Localized metadata is missing for route: ${route}`);
  }
}

for (const slug of ["tiktok", "bigo-live", "yaahlan", "xena", "catchii"]) {
  const slugToken = slug.includes("-") ? `"${slug}": {` : `${slug}: {`;
  if (!source.includes(slugToken)) {
    errors.push(`Program translation metadata is missing for: ${slug}`);
  }
}

if (errors.length) {
  console.error("Public translation verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Public translation verification passed: ${entries.length} entries, ${bySource.size} unique sources, ${requiredRoutes.length} localized routes, and 5 program metadata records.`
);
