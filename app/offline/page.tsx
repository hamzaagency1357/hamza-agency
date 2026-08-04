import Link from "next/link";

export const metadata = {
  title: "Offline | HAMZA AGENCY",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09050f] px-5 text-white" dir="rtl">
      <section className="w-full max-w-xl rounded-3xl border border-violet-300/20 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-3xl">⌁</div>
        <h1 className="mt-5 text-3xl font-black">أنت غير متصل حالياً</h1>
        <p className="mt-3 leading-7 text-white/70">يمكنك متابعة الصفحات العامة المحفوظة مسبقاً. بيانات الحسابات والطلبات والبوابات لا تُخزّن للعمل دون اتصال حفاظاً على الخصوصية.</p>
        <p className="mt-5 text-sm text-white/50" dir="ltr">You are offline. Authenticated and private data is never cached.</p>
        <p className="mt-2 text-sm text-white/50" dir="ltr">Çevrimdışısınız. Kimlik doğrulamalı ve özel veriler önbelleğe alınmaz.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-violet-600 px-6 font-bold">إعادة المحاولة من الصفحة الرئيسية</Link>
      </section>
    </main>
  );
}
