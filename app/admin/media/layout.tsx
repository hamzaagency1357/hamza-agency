import Link from "next/link";

export default function AdminMediaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav dir="rtl" aria-label="التنقل بين مكتبات الوسائط" className="fixed right-3 top-20 z-[75] flex flex-col gap-2 print:hidden md:right-5 md:top-24">
        <Link href="/admin/media" className="rounded-full border border-white/15 bg-[#0a0310]/95 px-4 py-2 text-xs font-black text-white/80 shadow-lg backdrop-blur-xl">الصور</Link>
        <Link href="/admin/media/cinematic" className="rounded-full border border-yellow-300/30 bg-[#100518]/95 px-4 py-2 text-xs font-black text-yellow-100 shadow-lg backdrop-blur-xl">الوسائط السينمائية</Link>
      </nav>
    </>
  );
}
