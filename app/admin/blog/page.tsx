import Link from "next/link";
import AdminBlogManager from "@/components/AdminBlogManager";

export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  return (
    <main className="min-h-screen bg-[#070009] px-4 py-8 text-white md:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-purple-200">إدارة المحتوى</p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">إدارة المدونة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">إنشاء المقالات بثلاث لغات، حفظ المسودات، الجدولة، المعاينة، والنشر مع إعدادات SEO.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 font-black">لوحة التحكم</Link>
            <Link href="/blog" target="_blank" className="inline-flex min-h-11 items-center rounded-xl border border-purple-300/25 bg-purple-500/10 px-4 font-black text-purple-100">فتح المدونة</Link>
          </div>
        </div>
        <AdminBlogManager />
      </div>
    </main>
  );
}
