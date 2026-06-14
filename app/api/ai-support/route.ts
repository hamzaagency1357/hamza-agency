import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type KnowledgeRow = {
  id?: string | number | null;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
};

type InsertPayload = Record<string, string | number | boolean | null>;

const BUILT_IN_KNOWLEDGE: KnowledgeRow[] = [
  {
    id: "programs",
    title: "البرامج المتاحة",
    summary: "وكالة حمزة تدير برامج ومنصات متعددة لصناع المحتوى.",
    content: "يمكنك الاطلاع على البرامج من صفحة البرامج. المنصات الحالية تشمل TikTok وBIGO LIVE وYaahlan وXena وCatchii، ويمكن إضافة منصات أخرى لاحقاً من الإدارة.",
    category: "برامج",
  },
  {
    id: "apply",
    title: "طريقة الانضمام",
    summary: "الانضمام يتم عبر نموذج طلب الانضمام الرسمي.",
    content: "للانضمام إلى وكالة حمزة، افتح صفحة طلب الانضمام، املأ البيانات بدقة، ثم تابع حالة الطلب من صفحة تتبع طلب الانضمام أو عبر واتساب عند الحاجة.",
    category: "انضمام",
  },
  {
    id: "services",
    title: "طلب خدمة رقمية",
    summary: "يمكن إرسال طلب خدمة رقمية من صفحة طلب الخدمة.",
    content: "الخدمات الرقمية تُطلب من نموذج طلب الخدمة. بعد الإرسال تحصل على كود متابعة، ويمكنك استخدامه في صفحة تتبع طلب الخدمة لمعرفة الحالة.",
    category: "خدمات",
  },
  {
    id: "tracking",
    title: "تتبع الطلبات",
    summary: "يمكن تتبع طلب الانضمام أو طلب الخدمة من صفحات التتبع.",
    content: "استخدم رقم واتسابك أو كود الطلب في صفحات التتبع لمعرفة حالة طلب الانضمام أو طلب الخدمة. إذا لم تظهر النتيجة، تواصل مع واتساب الوكالة.",
    category: "تتبع",
  },
  {
    id: "whatsapp",
    title: "التواصل الرسمي",
    summary: "واتساب هو المسار الرسمي للحالات الخاصة.",
    content: "أي حالة تحتاج قراراً إدارياً أو متابعة خاصة يجب تحويلها إلى واتساب وكالة حمزة الرسمي. لا يطلب الدعم الذكي كلمات مرور أو رموز تحقق.",
    category: "تواصل",
  },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^؀-ۿ\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function scoreKnowledge(question: string, item: KnowledgeRow) {
  const questionTokens = getTokens(question);
  const text = normalize([
    item.title,
    item.summary,
    item.content,
    item.category,
  ].filter(Boolean).join(" "));

  if (!questionTokens.length || !text) return 0;

  return questionTokens.reduce((score, token) => {
    return text.includes(token) ? score + 1 : score;
  }, 0);
}

function pickBestKnowledge(question: string, rows: KnowledgeRow[]) {
  const ranked = rows
    .map((row) => ({ row, score: scoreKnowledge(question, row) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].row : null;
}

function buildAnswer(question: string, knowledge: KnowledgeRow | null) {
  if (!knowledge) {
    return {
      answer: "لم أجد إجابة مؤكدة داخل قاعدة المعرفة الحالية. تم حفظ سؤالك ليراجعه فريق وكالة حمزة، وللحالات المستعجلة تواصل عبر واتساب الرسمي.",
      status: "unanswered",
      source: "unanswered",
      escalated: true,
    };
  }

  const content = cleanText(knowledge.content) || cleanText(knowledge.summary) || cleanText(knowledge.title);
  const answer = content.length > 900 ? `${content.slice(0, 900)}...` : content;

  return {
    answer,
    status: "answered",
    source: cleanText(knowledge.category) || "knowledge_base",
    escalated: false,
  };
}

async function insertWithFallback(table: string, payloads: InsertPayload[]) {
  if (!supabase) return false;

  for (const payload of payloads) {
    const { error } = await supabase.from(table).insert(payload as never);
    if (!error) return true;
  }

  return false;
}

async function loadKnowledgeBase() {
  if (!supabase) return BUILT_IN_KNOWLEDGE;

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, summary, content, category")
    .eq("is_published", true)
    .limit(120);

  if (error || !data?.length) return BUILT_IN_KNOWLEDGE;

  return [...(data as KnowledgeRow[]), ...BUILT_IN_KNOWLEDGE];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = cleanText(body.question);
    const visitorName = cleanText(body.name) || "زائر الموقع";
    const whatsapp = cleanText(body.whatsapp);

    if (!question || question.length < 3) {
      return NextResponse.json(
        { ok: false, message: "اكتب سؤالاً واضحاً قبل الإرسال." },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        ok: true,
        answer: "الدعم الذكي غير متصل بقاعدة البيانات حالياً. تواصل مع وكالة حمزة عبر واتساب للحالات المستعجلة.",
        status: "escalated",
        source: "fallback",
        escalated: true,
        saved: false,
      });
    }

    const knowledgeRows = await loadKnowledgeBase();
    const bestKnowledge = pickBestKnowledge(question, knowledgeRows);
    const response = buildAnswer(question, bestKnowledge);
    const now = new Date().toISOString();

    const conversationPayloads: InsertPayload[] = [
      {
        visitor_name: visitorName,
        whatsapp,
        question,
        answer: response.answer,
        status: response.status,
        source: response.source,
        created_at: now,
      },
      {
        visitor_name: visitorName,
        phone: whatsapp,
        user_message: question,
        ai_response: response.answer,
        status: response.status,
        created_at: now,
      },
      {
        session_id: whatsapp || visitorName,
        message: question,
        response: response.answer,
        status: response.status,
        created_at: now,
      },
      {
        question,
        answer: response.answer,
        status: response.status,
      },
    ];

    const savedConversation = await insertWithFallback("ai_conversations", conversationPayloads);

    let savedUnanswered = false;
    if (response.status === "unanswered") {
      savedUnanswered = await insertWithFallback("ai_unanswered_questions", [
        {
          visitor_name: visitorName,
          whatsapp,
          question,
          status: "unanswered",
          created_at: now,
        },
        {
          visitor_name: visitorName,
          phone: whatsapp,
          question,
          status: "pending",
          created_at: now,
        },
        {
          question,
          status: "unanswered",
        },
      ]);
    }

    return NextResponse.json({
      ok: true,
      answer: response.answer,
      status: response.status,
      source: response.source,
      escalated: response.escalated,
      saved: savedConversation,
      savedUnanswered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير معروف";

    return NextResponse.json(
      {
        ok: false,
        message: `تعذر تشغيل الدعم الذكي: ${message}`,
      },
      { status: 500 }
    );
  }
}
