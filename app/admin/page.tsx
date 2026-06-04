export default function AdminPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#070009] text-white p-6"
    >
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          لوحة إدارة وكالة حمزة
        </h1>

        <p className="text-zinc-400 mb-10">
          إدارة طلبات الانضمام للوكالة
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">إجمالي الطلبات</div>
            <div className="text-3xl font-bold mt-2">0</div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">طلبات جديدة</div>
            <div className="text-3xl font-bold mt-2">0</div>
          </div>

        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
          <h2 className="text-2xl font-bold mb-4">
            طلبات الانضمام
          </h2>

          <p className="text-zinc-400">
            سيتم ربط الطلبات القادمة من Supabase هنا في الخطوة التالية.
          </p>
        </div>

      </div>
    </main>
  );
}
