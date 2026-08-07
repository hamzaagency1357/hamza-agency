export default function BlogLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="min-h-screen bg-[#070009] px-5 py-16 text-white">
      <span className="sr-only">Loading blog content</span>
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-64 rounded-[2rem] bg-white/[0.06]" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-[2rem] bg-white/[0.05]" />
          <div className="h-80 rounded-[2rem] bg-white/[0.05]" />
        </div>
      </div>
    </main>
  );
}
