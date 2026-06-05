import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070009] px-5 py-16 text-white"
    >
      <NotFoundBackground />

      <section className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
          HAMZA AGENCY
        </div>

        <h1 className="bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-8xl font-black text-transparent md:text-9xl">
          404
        </h1>

        <h2 className="mt-6 text-4xl font-black md:text-6xl">
          الصفحة غير موجودة
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-white/70">
          الرابط الذي تحاول فتحه غير موجود أو تم تغييره. يمكنك العودة إلى
          الصفحة الرئيسية أو تصفح البرامج المتاحة في وكالة حمزة.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)]"
          >
            العودة للرئيسية
          </Link>

          <Link
            href="/programs"
            className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-4 font-black text-white backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10"
          >
            عرض البرامج
          </Link>

          <a
            href="https://wa.me/905011730377"
            target="_blank"
            className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
          >
            واتساب
          </a>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Link
            href="/about"
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:border-purple-400/50"
          >
            من نحن
          </Link>

          <Link
            href="/services"
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:border-purple-400/50"
          >
            خدمات الوكالة
          </Link>

          <Link
            href="/contact"
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:border-purple-400/50"
          >
            اتصل بنا
          </Link>
        </div>
      </section>
    </main>
  );
}

function NotFoundBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.36)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
