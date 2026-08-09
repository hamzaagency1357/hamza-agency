import Link from "next/link";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-4">
    <nav aria-label="إعدادات الموقع" className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.035] p-2 text-sm">
      <Link href="/admin/settings" className="inline-flex min-h-11 items-center rounded-xl px-4 font-bold text-white/75 transition hover:bg-white/[.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">إعدادات الموقع</Link>
      <Link href="/admin/settings/identity" className="inline-flex min-h-11 items-center rounded-xl border border-purple-300/20 bg-purple-500/10 px-4 font-black text-purple-100 transition hover:bg-purple-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300">هوية الوكالة والوكيل</Link>
    </nav>
    {children}
  </div>;
}
