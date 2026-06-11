import Link from "next/link";

const aiSupportFeatures = [
  {
    title: "إجابات أولية منظمة",
    text: "توضيح الأسئلة المتكررة حول البرامج، شروط الانضمام، الخدمات الرقمية، وطريقة المتابعة قبل تحويل الحالة إلى فريق الوكالة.",
  },
  {
    title: "تصعيد ذكي إلى واتساب",
    text: "عندما يحتاج الزائر إلى قرار إداري أو تفاصيل خاصة، يتم توجيهه للتواصل مع رقم الواتساب الرسمي بدلاً من إعطاء وعود غير مؤكدة.",
  },
  {
    title: "حفظ الأسئلة غير المجابة",
    text: "تجميع الأسئلة التي لا توجد لها إجابة جاهزة لمراجعتها لاحقاً وتحويلها إلى محتوى أو تعليمات واضحة داخل لوحة الإدارة.",
  },
  {
    title: "دعم متعدد الأقسام",
    text: "إمكانية استخدام نفس مسار الدعم للبرامج، طلبات الانضمام، الخدمات الرقمية، التتبع، والسياسات العامة للموقع.",
  },
];

const safetyRules = [
  "الدعم بالذكاء الصناعي لا يطلب كلمات مرور أو رموز تحقق أو بيانات دخول.",
  "أي قرار قبول أو تنفيذ خدمة يبقى بيد فريق وكالة حمزة وليس رداً آلياً نهائياً.",
  "الذكاء الصناعي يساعد في التنظيم والشرح، أما الحالات الخاصة فتُحوّل إلى واتساب رسمي.",
  "يجب أن تبقى الردود منسجمة مع سياسات المنصات وقوانين الوكالة وعدم تقديم وعود غير مؤكدة.",
];

const implementationSteps = [
  "تجهيز قاعدة معرفة مختصرة من محتوى الموقع الحالي.",
  "ربط الأسئلة المتكررة بالبرامج والخدمات الرقمية.",
  "إضافة رسالة تصعيد واضحة إلى واتساب عند الحاجة.",
  "تفعيل حفظ الأسئلة غير المجابة للمراجعة من الإدارة.",
  "اختبار الردود قبل إظهارها كجزء فعلي من الموقع.",
];

export default function AiSupportPage() {
  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <AiSupportBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <header className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_55px_rgba(168,85,247,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
            HAMZA AGENCY AI Support
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            الدعم بالذكاء الصناعي
            <span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">
              تنظيم أسرع وتحويل أوضح إلى فريق الوكالة
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">
            هذه الصفحة توضّح مسار الدعم الذكي المخطط داخل وكالة حمزة. الهدف هو مساعدة الزائر على فهم البرامج والخدمات وخطوات المتابعة بسرعة، مع تحويل الحالات الخاصة إلى واتساب رسمي عند الحاجة.
          </p>

          <div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-50/80">
            ملاحظة مهمة: هذه المرحلة تعريفية وتنظيمية. لم يتم تفعيل محادثة ذكاء صناعي مباشرة داخل الموقع بعد، وسيتم اختبار أي ربط فعلي قبل اعتماده للزوار.
          </div>
        </header>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {aiSupportFeatures.map((feature) => (
            <article key={feature.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
              <h2 className="text-2xl font-black">{feature.title}</h2>
              <p className="mt-4 leading-8 text-white/68">{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">قواعد الأمان والثقة</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {safetyRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75">
                {rule}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">خطوات التفعيل المقترحة</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {implementationSteps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-purple-600 font-black">
                  {index + 1}
                </div>
                <p className="leading-7 text-white/75">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black text-green-100">تحتاج دعماً مباشراً الآن؟</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            قبل تفعيل الدعم الآلي الكامل، يبقى واتساب هو المسار الرسمي للتواصل مع فريق وكالة حمزة وتأكيد التفاصيل.
          </p>
          <a
            href="https://wa.me/905011730377"
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
          >
            تواصل عبر واتساب
          </a>
        </section>
      </section>
    </main>
  );
}

function AiSupportBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.16)_0%,rgba(124,58,237,0.22)_34%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
