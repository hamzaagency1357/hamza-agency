import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ResetRequest = {
  secret?: string;
  userId?: string;
  password?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const emergencySecret = process.env.HAMZA_EMERGENCY_RESET_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !emergencySecret) {
    return jsonResponse(
      {
        ok: false,
        message:
          "إعدادات الطوارئ غير مكتملة. أضف SUPABASE_SERVICE_ROLE_KEY و HAMZA_EMERGENCY_RESET_SECRET في Vercel.",
      },
      500
    );
  }

  let payload: ResetRequest;

  try {
    payload = (await request.json()) as ResetRequest;
  } catch {
    return jsonResponse({ ok: false, message: "طلب غير صالح." }, 400);
  }

  const secret = payload.secret?.trim();
  const userId = payload.userId?.trim();
  const password = payload.password || "";

  if (!secret || secret !== emergencySecret) {
    return jsonResponse({ ok: false, message: "رمز الطوارئ غير صحيح." }, 401);
  }

  if (!userId) {
    return jsonResponse({ ok: false, message: "User ID مطلوب." }, 400);
  }

  if (password.length < 10) {
    return jsonResponse(
      { ok: false, message: "كلمة المرور يجب أن تكون 10 أحرف على الأقل." },
      400
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    return jsonResponse(
      {
        ok: false,
        message: "تعذر تغيير كلمة المرور. تأكد من User ID ومن مفتاح Service Role.",
      },
      500
    );
  }

  return jsonResponse({
    ok: true,
    message:
      "تم تغيير كلمة المرور بنجاح. احذف أداة الطوارئ ومتغيراتها بعد تسجيل الدخول.",
  });
}
