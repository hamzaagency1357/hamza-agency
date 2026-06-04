"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const programs = {
  "tiktok": {
    name: "TikTok",
    status: "متاح",
    description: "برنامج تيك توك لصناع المحتوى والبث المباشر مع دعم وكالة حمزة في التطوير والمتابعة.",
    work: "تساعدك وكالة حمزة على تنظيم حضورك، متابعة أدائك، تقديم الإرشاد، وحل المشاكل المرتبطة بالحساب والبث.",
    conditions: ["الالتزام بسياسات المنصة", "الجدية في صناعة المحتوى", "وجود رقم واتساب للتواصل", "الالتزام بتعليمات الوكالة"],
    earnings: "الأرباح تختلف حسب نشاط الحساب، جودة المحتوى، الالتزام، ونظام البرنامج.",
    agencySupport: ["دعم فني", "متابعة أداء", "تدريب وإرشاد", "حل مشاكل تقنية", "تطوير الحساب"],
    updates: "سيتم عرض تحديثات TikTok الرسمية والداخلية هنا لاحقاً من لوحة التحكم.",
  },
  "bigo-live": {
    name: "BIGO LIVE",
    status: "متاح",
    description: "برنامج BIGO LIVE للبث المباشر وصناع المحتوى مع إدارة ومتابعة احترافية.",
    work: "تقوم الوكالة بمساعدة صانع المحتوى على فهم طريقة العمل، تحسين جودة البث، ومتابعة الأداء.",
    conditions: ["الالتزام بالبث الجاد", "احترام قوانين المنصة", "التواصل عبر واتساب", "الالتزام بخطة الوكالة"],
    earnings: "الأرباح تعتمد على التفاعل، مدة النشاط، ونظام البرنامج.",
    agencySupport: ["إدارة مباشرة", "دعم فني", "متابعة يومية", "نصائح لتحسين الأداء", "حل المشاكل"],
    updates: "سيتم عرض تحديثات BIGO LIVE من لوحة التحكم لاحقاً.",
  },
  "yaahlan": {
    name: "Yaahlan",
    status: "متاح",
    description: "برنامج Yaahlan لصناع المحتوى والتواصل والبث مع فرص نمو عبر وكالة حمزة.",
    work: "تساعد الوكالة في شرح آلية البرنامج، متابعة الطلبات، وتوجيه صانع المحتوى.",
    conditions: ["الجدية", "احترام شروط البرنامج", "توفر واتساب", "التعاون مع الإدارة"],
    earnings: "الأرباح يتم توضيحها حسب نظام البرنامج والحالة الخاصة بكل حساب.",
    agencySupport: ["شرح النظام", "متابعة الطلب", "حل المشاكل", "تطوير الحضور", "دعم مستمر"],
    updates: "سيتم عرض تحديثات Yaahlan هنا لاحقاً.",
  },
  "xena": {
    name: "Xena",
    status: "متاح",
    description: "برنامج Xena لصناع المحتوى مع دعم وكالة حمزة في الإدارة والتطوير.",
    work: "نساعد صانع المحتوى على فهم البرنامج، تقديم الطلب، ومتابعة القبول والتطوير.",
    conditions: ["الالتزام", "الجدية", "احترام سياسات البرنامج", "تقديم معلومات صحيحة"],
    earnings: "الأرباح تختلف حسب نشاط المستخدم ونظام البرنامج.",
    agencySupport: ["تقديم ومتابعة", "تدريب", "إرشاد", "دعم فني", "تحسين الأداء"],
    updates: "سيتم إضافة تحديثات Xena من لوحة التحكم لاحقاً.",
  },
  "catchii": {
    name: "Catchii",
    status: "متاح",
    description: "برنامج Catchii لصناع المحتوى مع فرص انضمام ودعم احترافي من وكالة حمزة.",
    work: "تقوم الوكالة بشرح شروط البرنامج ومساعدة المتقدم على الانضمام بالشكل الصحيح.",
    conditions: ["معلومات صحيحة", "التزام بالتعليمات", "تواصل عبر واتساب", "جدية في العمل"],
    earnings: "الأرباح تعتمد على النظام المعتمد داخل البرنامج ومستوى النشاط.",
    agencySupport: ["شرح البرنامج", "متابعة الطلب", "دعم مباشر", "حل المشاكل", "توجيه مستمر"],
    updates: "سيتم عرض تحديثات Catchii هنا لاحقاً.",
  },
};

export default function ProgramDetailsPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const program = programs[slug as keyof typeof programs];

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    country: "",
    whatsapp: "",
    previousExperience: "",
    notes: "",
  });

  if (!program) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-20 text-white">
        <h1 className="text-4xl font-black">البرنامج غير موجود</h1>
        <Link href="/programs" className="mt-8 inline-block text-purple-300">
          العودة إلى البرامج
        </Link>
      </main>
    );
  }

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!form.fullName || !form.country || !form.whatsapp) {
      setMessage("يرجى تعبئة الحقول الأساسية.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    const duplicateKey = `hamza-agency-${form.whatsapp}-${program.name}`;
    if (localStorage.getItem(duplicateKey)) {
      setMessage("تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      platform: program.name,
      previous_experience: form.previousExperience.trim(),
      notes: form.notes.trim(),
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setMessage("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      return;
    }

    localStorage.setItem(duplicateKey, "true");
    setMessage("تم استلام طلبك بنجاح. سيتم التواصل معك عبر واتساب بعد المراجعة.");

    setForm({
      fullName: "",
      country: "",
      whatsapp: "",
      previousExperience: "",
      notes: "",
    });

    setTimeout(() => {
      setMessage("");
      setShowForm(false);
    }, 3000);
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <Link href="/programs" className="mb-8 inline-block text-purple-200">
          ← العودة إلى البرامج
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 shadow-[0_0_60px_rgba(168,85,247,0.18)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
                {program.status}
              </span>
              <h1 className="mt-6 text-5xl font-black">{program.name}</h1>
            </div>

            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-600 to-yellow-400 text-3xl font-black shadow-[0_0_45px_rgba(168,85,247,0.45)]">
              {program.name.charAt(0)}
            </div>
          </div>

          <p className="text-xl leading-10 text-white/75">{program.description}</p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black shadow-[0_0_35px_rgba(168,85,247,0.4)]"
          >
            انضم الآن
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <InfoCard title="طريقة العمل" content={program.work} />
          <InfoCard title="نظام الأرباح" content={program.earnings} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <ListCard title="شروط القبول" items={program.conditions} />
          <ListCard title="ماذا تقدم وكالة حمزة؟" items={program.agencySupport} />
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-3xl font-black">آخر التحديثات</h2>
          <p className="mt-4 leading-9 text-white/70">{program.updates}</p>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-3xl font-black">الأسئلة الشائعة</h2>
          <div className="mt-6 space-y-4">
            <Faq q="هل أستطيع التقديم الآن؟" a="نعم، البرنامج متاح حالياً ويمكنك إرسال طلبك من زر انضم الآن." />
            <Faq q="هل القبول مضمون؟" a="يتم مراجعة الطلب حسب معلوماتك، البرنامج المختار، وشروط القبول." />
            <Faq q="كيف يتم التواصل معي؟" a="سيتم التواصل معك عبر رقم واتساب الذي تضعه في الطلب." />
          </div>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setMessage("");
                  setShowForm(false);
                }}
                className="rounded-full border border-white/15 px-5 py-2 text-white/70"
              >
                إغلاق
              </button>
              <h2 className="text-3xl font-black">طلب الانضمام إلى {program.name}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="الاسم الثلاثي" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.country} onChange={(e) => updateField("country", e.target.value)} placeholder="الدولة" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />
              <input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="رقم واتساب" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <h3 className="mb-3 text-2xl font-black">خبرات سابقة</h3>
                <p className="mb-4 text-lg text-purple-200">
                  هل عملت على برامج أو وكالات أخرى سابقاً؟
                </p>
                <textarea value={form.previousExperience} onChange={(e) => updateField("previousExperience", e.target.value)} placeholder="اكتب خبراتك السابقة إن وجدت" className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" />
              </div>

              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="ملاحظات إضافية" className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400" />

              {message && (
                <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">
                  {message}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mt-4 leading-9 text-white/70">{content}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-3xl font-black">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-white/75">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="font-bold text-purple-200">{q}</div>
      <div className="mt-2 text-white/70">{a}</div>
    </div>
  );
}
