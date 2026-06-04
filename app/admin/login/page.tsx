export default function AdminLoginPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-black/30 p-8">
        <h1 className="text-4xl font-bold text-center mb-3">
          تسجيل دخول الإدارة
        </h1>

        <p className="text-zinc-400 text-center mb-8">
          لوحة إدارة وكالة حمزة
        </p>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            className="w-full rounded-xl bg-black/40 border border-purple-500/20 p-3"
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            className="w-full rounded-xl bg-black/40 border border-purple-500/20 p-3"
          />

          <button
            type="submit"
            className="w-full rounded-xl bg-purple-600 p-3 font-bold"
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </main>
  );
}
