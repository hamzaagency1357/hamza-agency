import type { StaticCopyKey } from "@/lib/i18n/staticCopy";

export type ProgramVisual = {
  variant: string;
  label: string;
  accent: string;
  secondary: string;
  badge: string;
  fallbackDescription: string;
  fallbackRequirements: string;
  fallbackBenefits: string;
  fallbackUpdates: string;
  fallbackFaq: string;
};

export const programNames: Record<string, string> = {
  tiktok: "TikTok",
  "bigo-live": "BIGO LIVE",
  yaahlan: "Yaahlan",
  xena: "Xena",
  catchii: "Catchii",
};

export const visualLabelKeys: Record<string, StaticCopyKey> = {
  tiktok: "programsVisualShortVideos",
  "bigo-live": "programsVisualLiveStream",
  yaahlan: "programsVisualCommunityLive",
  xena: "programsVisualCreators",
  catchii: "programsVisualSocial",
};

export const programVisuals: Record<string, ProgramVisual> = {
  tiktok: {
    variant: "tiktok",
    label: "Short Video Creator Program",
    accent: "#ff2f8b",
    secondary: "#22d3ee",
    badge: "فيديوهات قصيرة • صناع محتوى • نمو سريع",
    fallbackDescription: "برنامج TikTok مخصص لصناع المحتوى الذين يريدون تطوير ظهورهم، تحسين جودة المحتوى، وفهم طريقة العمل داخل الوكالة بشكل احترافي.",
    fallbackRequirements: "العمر 18 سنة أو أكثر\nحساب TikTok نشط\nالالتزام بسياسات المنصة\nالقدرة على إنشاء محتوى أو بث بشكل منتظم",
    fallbackBenefits: "دعم فني ومتابعة\nتطوير الحساب وتحسين الأداء\nإرشاد حول المحتوى المناسب\nمساعدة في حل المشاكل التقنية",
    fallbackUpdates: "تم فتح باب الانضمام لبرنامج TikTok عبر وكالة حمزة.",
    fallbackFaq: "هل القبول مضمون؟\nيتم مراجعة كل طلب حسب معلومات الحساب ونشاط المتقدم.\n\nهل أحتاج عدد متابعين محدد؟\nلا نعتمد على رقم ثابت فقط، بل ننظر إلى الجدية ونوع المحتوى.",
  },
  "bigo-live": {
    variant: "bigo",
    label: "Live Streaming Creator Program",
    accent: "#38bdf8",
    secondary: "#a855f7",
    badge: "بث مباشر • لايف • دعم يومي",
    fallbackDescription: "برنامج BIGO LIVE مناسب لصناع المحتوى المهتمين بالبث المباشر، بناء جمهور نشط، وتحسين طريقة الظهور والتفاعل داخل اللايف.",
    fallbackRequirements: "العمر 18 سنة أو أكثر\nالقدرة على الظهور أو إدارة بث مباشر\nالتزام واحترام قوانين البرنامج\nرقم واتساب للتواصل والمتابعة",
    fallbackBenefits: "متابعة أداء البث\nإرشاد حول أسلوب اللايف\nدعم في مشاكل الحساب\nتوجيه لتحسين التفاعل مع الجمهور",
    fallbackUpdates: "برنامج BIGO LIVE متاح حالياً للتقديم من خلال وكالة حمزة.",
    fallbackFaq: "هل أحتاج خبرة بث؟\nالخبرة تساعد، لكن يمكن قبول المبتدئين الجادين.\n\nهل يوجد تدريب؟\nنعم، يتم توجيه المقبولين حسب وضع حسابهم.",
  },
  yaahlan: {
    variant: "yaahlan",
    label: "Community Live Program",
    accent: "#f59e0b",
    secondary: "#8b5cf6",
    badge: "مجتمع • تواصل • بث مباشر",
    fallbackDescription: "برنامج Yaahlan يركز على بناء حضور اجتماعي وتفاعل مباشر مع الجمهور، مع دعم وكالة حمزة في المتابعة والتوجيه.",
    fallbackRequirements: "حساب نشط أو رغبة جدية بالبدء\nالتزام بالتواصل والمتابعة\nاحترام سياسات المنصة\nتوفر رقم واتساب صحيح",
    fallbackBenefits: "تعريف بطريقة العمل\nمتابعة الطلبات والمشاكل\nمساعدة في تحسين الحساب\nدعم في خطوات الانضمام",
    fallbackUpdates: "التقديم على Yaahlan متاح حالياً عبر وكالة حمزة.",
    fallbackFaq: "هل البرنامج مناسب للمبتدئين؟\nنعم، إذا كان المتقدم جاداً وقادراً على الالتزام.\n\nكيف تتم المتابعة؟\nغالباً عبر واتساب بعد مراجعة الطلب.",
  },
  xena: {
    variant: "xena",
    label: "Future Creator Program",
    accent: "#a855f7",
    secondary: "#06b6d4",
    badge: "Creator Program • مستقبل المحتوى • وكالة",
    fallbackDescription: "برنامج Xena مناسب لصناع المحتوى الراغبين بالانضمام إلى برنامج منظم مع متابعة إدارية ودعم لتطوير الحساب.",
    fallbackRequirements: "العمر المناسب حسب شروط البرنامج\nحساب نشط أو قابل للتطوير\nالالتزام بالتعليمات\nتقديم معلومات صحيحة",
    fallbackBenefits: "دعم فني وإداري\nمتابعة حالة الحساب\nتوجيه لصانع المحتوى\nمساعدة في فهم نظام البرنامج",
    fallbackUpdates: "برنامج Xena متاح حالياً ضمن برامج وكالة حمزة.",
    fallbackFaq: "هل يتم التواصل بعد التقديم؟\nبعد مراجعة الطلب، قد يتواصل فريق الوكالة عبر واتساب.\n\nهل أستطيع التقديم بدون خبرة؟\nنعم، لكن الخبرة السابقة تساعد في التقييم.",
  },
  catchii: {
    variant: "catchii",
    label: "Social Creator Program",
    accent: "#ec4899",
    secondary: "#facc15",
    badge: "Social • Entertainment • Creator Growth",
    fallbackDescription: "برنامج Catchii مناسب لصناع المحتوى المهتمين بالتواصل والترفيه وبناء حضور اجتماعي ضمن بيئة وكالة احترافية.",
    fallbackRequirements: "حساب أو رغبة جدية بالعمل\nالتزام بسياسات البرنامج\nقدرة على التواصل والمتابعة\nمعلومات تواصل صحيحة",
    fallbackBenefits: "مساعدة في خطوات البداية\nدعم في المشاكل التقنية\nمتابعة وتوجيه\nإرشاد لتحسين جودة الحساب",
    fallbackUpdates: "برنامج Catchii متاح حالياً للتقديم عبر وكالة حمزة.",
    fallbackFaq: "هل يمكنني التقديم من أي دولة؟\nيمكنك التقديم، وتتم المراجعة حسب شروط البرنامج.\n\nهل التواصل يكون واتساب؟\nنعم، بعد المراجعة قد يتم التواصل عبر واتساب.",
  },
};

export const defaultProgramVisual: ProgramVisual = {
  variant: "programs",
  label: "Creator Agency Program",
  accent: "#7c3aed",
  secondary: "#d4af37",
  badge: "برنامج صناع محتوى • وكالة حمزة",
  fallbackDescription: "هذا البرنامج جزء من منظومة وكالة حمزة لدعم صناع المحتوى ومساعدتهم على الانضمام للبرامج المناسبة وتطوير حضورهم.",
  fallbackRequirements: "تقديم معلومات صحيحة\nرقم واتساب فعال\nالالتزام بشروط المنصة\nالجدية في العمل والمتابعة",
  fallbackBenefits: "دعم إداري وفني\nمتابعة الطلب\nإرشاد لصانع المحتوى\nمساعدة في حل المشاكل التقنية",
  fallbackUpdates: "هذا البرنامج متاح للتقديم حالياً عبر وكالة حمزة.",
  fallbackFaq: "هل القبول مضمون؟\nكل طلب يخضع للمراجعة.\n\nكيف أعرف حالة طلبي؟\nيمكنك متابعة طلبك من صفحة تتبع طلب الانضمام أو التواصل عبر واتساب.",
};
