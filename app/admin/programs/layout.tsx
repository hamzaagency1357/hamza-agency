import Link from "next/link";

export default function ProgramsAdminLayout({ children }: { children: React.ReactNode }) {
  return <>
    <div dir="rtl" className="border-b border-purple-400/15 bg-[#0b0312] px-4 py-3 text-white">
      <nav className="mx-auto flex max-w-7xl flex-wrap gap-2" aria-label="إدارة البرامج">
        <Link href="/admin/programs" className="rounded-full border border-white/15 px-4 py-2 text-sm font-black">بيانات البرامج</Link>
        <Link href="/admin/programs/media" className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-sm font-black text-yellow-100">صور البرامج وAlt/OG</Link>
      </nav>
    </div>
    {children}
  </>;
}
