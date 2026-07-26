"use client";

import { useEffect } from "react";

export default function LegacyResetPasswordRedirectPage() {
  useEffect(() => {
    const destination = `/admin/reset-password${window.location.search}${window.location.hash}`;
    window.location.replace(destination);
  }, []);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#070009] p-6 text-white"
    >
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/45 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
          HAMZA AGENCY
        </p>
        <h1 className="mt-4 text-3xl font-black">استعادة كلمة المرور</h1>
        <p className="mt-4 leading-7 text-white/60">
          جاري تحويلك بأمان إلى صفحة استعادة الحساب…
        </p>
      </div>
    </main>
  );
}
