import Link from "next/link";

export default function VisualExperienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Link href="/admin/media/cinematic" className="fixed bottom-36 right-4 z-[75] rounded-full border border-yellow-300/30 bg-[#100518]/95 px-5 py-3 text-sm font-black text-yellow-100 shadow-lg backdrop-blur-xl md:bottom-5">الوسائط السينمائية</Link>
    </>
  );
}
