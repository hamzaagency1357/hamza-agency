import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#050008] px-5 py-10 text-white md:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-purple-700/25 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[-10%] h-96 w-96 rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[2.5rem] border border-purple-300/20 bg-white/[0.045] p-7 text-center shadow-[0_0_90px_rgba(126,34,206,0.22)] backdrop-blur-xl md:p-12">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-yellow-300/25 bg-yellow-400/10 px-5 py-2 text-sm font-black text-yellow-100">
            HAMZA AGENCY
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            الموقع تحت الصيانة المؤقتة
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/65 md:text-xl">
            نعمل حالياً على تحسين تجربة وكالة حمزة وتجهيز تحديثات إدارية وتشغيلية مهمة. سيعود الموقع للعمل قريباً بشكل طبيعي.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatusCard title="حالة الموقع" value="صيانة مؤقتة" />
            <StatusCard title="الخدمات" value="قيد التحديث" />
            <StatusCard title="التواصل" value="متاح عبر واتساب" />
          </div>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/905011730377"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.28)] transition hover:scale-[1.02]"
            >
              تواصل عبر واتساب
            </a>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/[0.05] px-7 py-4 font-bold text-white/75 transition hover:border-purple-300/40 hover:text-white"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="text-sm font-bold text-white/45">{title}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}
