const platforms = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii"];

const benefits = [
  "إدارة احترافية لصناع المحتوى",
  "متابعة يومية وتوجيه مستمر",
  "دعم في مشاكل المنصات والبث",
  "فرص نمو وأرباح أفضل",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050008] text-white overflow-hidden">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7c2cff55,transparent_35%),radial-gradient(circle_at_bottom,#d4af3740,transparent_30%)]" />
        <div className="absolute inset-0 bg-black/45" />

        <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/Logo hamza agency.jpg"
              alt="Hamza Agency"
              className="h-12 w-12 rounded-xl object-cover"
            />
            <div className="text-lg font-bold tracking-wide">Hamza Agency</div>
          </div>

          <a
            href="https://wa.me/905011730377"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/90 backdrop-blur hover:bg-white/10"
          >
            واتساب
          </a>
        </nav>

        <div className="relative z-10 max-w-5xl pt-24">
          <img
            src="/Logo hamza agency.jpg"
            alt="Hamza Agency Logo"
            className="mx-auto mb-8 h-40 w-40 rounded-3xl object-cover shadow-[0_0_60px_rgba(168,85,247,0.35)]"
          />

          <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100">
            وكالة رقمية فاخرة لصناع المحتوى
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            وكالة حمزة لإدارة وتطوير
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              صناع المحتوى
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/75 md:text-2xl">
            نساعد المبدعين على النمو وتحقيق الأرباح على منصات البث المباشر
            والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية
            للتطور.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="https://wa.me/905011730377"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.45)]"
            >
              انضم الآن
            </a>
            <a
              href="tel:+905011730377"
              className="rounded-full border border-white/20 px-8 py-4 text-lg font-bold text-white/85 hover:bg-white/10"
            >
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-black">
            البرامج المتوفرة حالياً
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {platforms.map((platform) => (
              <div
                key={platform}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_0_30px_rgba(124,44,255,0.12)] backdrop-blur"
              >
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-yellow-400" />
                <h3 className="text-xl font-bold">{platform}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.07] to-purple-500/[0.08] p-8 md:p-12">
          <h2 className="text-4xl font-black">لماذا وكالة حمزة؟</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-2xl border border-white/10 bg-black/30 p-6 text-lg text-white/85"
              >
                ✦ {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <a
        href="https://wa.me/905011730377"
        className="fixed bottom-6 left-6 z-50 rounded-full bg-green-500 px-5 py-3 font-bold text-white shadow-lg"
      >
        واتساب
      </a>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-white/60">
        Hamza Agency © 2026 — وكالة حمزة
      </footer>
    </main>
  );
}
