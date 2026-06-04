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
          إدارة طلبات الانضمام والبرامج والمحتوى
        </p>

        <div className="grid md:grid-cols-4 gap-4 mb-8">

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">إجمالي الطلبات</div>
            <div className="text-4xl font-bold mt-2">0</div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">طلبات جديدة</div>
            <div className="text-4xl font-bold mt-2">0</div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">طلبات مقبولة</div>
            <div className="text-4xl font-bold mt-2">0</div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
            <div className="text-zinc-400">طلبات مرفوضة</div>
            <div className="text-4xl font-bold mt-2">0</div>
          </div>

        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              طلبات الانضمام
            </h2>

            <input
              placeholder="بحث..."
              className="bg-black/40 border border-purple-500/20 rounded-xl px-4 py-2"
            />
          </div>

          <div className="overflow-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-purple-500/20 text-zinc-400">
                  <th className="text-right p-3">الاسم</th>
                  <th className="text-right p-3">الدولة</th>
                  <th className="text-right p-3">البرنامج</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>

              <tbody>

                <tr>
                  <td className="p-3">لا توجد طلبات حالياً</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                </tr>

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </main>
  );
}
