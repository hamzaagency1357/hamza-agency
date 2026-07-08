"use client";

import { useEffect, useState } from "react";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type JobExportRow = {
  title: string | null;
  status: string | null;
  department: string | null;
  location: string | null;
  job_type: string | null;
  created_at: string | null;
};

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  paused: "متوقفة مؤقتاً",
  closed: "مغلقة",
};

function csvValue(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function getStatusLabel(status: string | null | undefined) {
  return statusLabels[status || ""] || status || "غير محدد";
}

function downloadCsv(filename: string, rows: Array<Array<string | number | boolean | null | undefined>>) {
  const csvContent = rows.map((row) => row.map((cell) => csvValue(cell)).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminJobsCsvExport() {
  const [canExport, setCanExport] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      const access = await requireAdminModuleAccess("jobs");

      if (!isMounted) return;

      setCanExport(access.isAuthorized && Boolean(access.profile));
      setIsChecking(false);
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  async function exportJobsCsv() {
    setMessage("");

    const access = await requireAdminModuleAccess("jobs");

    if (!access.isAuthorized || !access.profile || !supabase) {
      setCanExport(false);
      setMessage("غير مصرح بتصدير الوظائف.");
      return;
    }

    setIsExporting(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("title, status, department, location, job_type, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    setIsExporting(false);

    if (error) {
      setMessage("تعذر تجهيز ملف CSV للوظائف.");
      return;
    }

    const jobs = (data || []) as JobExportRow[];

    if (jobs.length === 0) {
      setMessage("لا توجد وظائف لتصديرها.");
      return;
    }

    const rows = [
      ["title", "status", "department", "location", "job_type", "created_at"],
      ...jobs.map((job) => [
        job.title || "",
        getStatusLabel(job.status),
        job.department || "",
        job.location || "",
        job.job_type || "",
        job.created_at || "",
      ]),
    ];

    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`jobs-export-${date}.csv`, rows);
    setMessage(`تم تصدير ${jobs.length} وظيفة بصيغة CSV.`);
  }

  if (isChecking || !canExport) return null;

  return (
    <div dir="rtl" className="fixed bottom-6 left-6 z-50 flex max-w-[calc(100vw-3rem)] flex-col items-end gap-2">
      {message && (
        <div className="rounded-2xl border border-yellow-400/25 bg-black/85 px-4 py-3 text-xs font-bold leading-6 text-yellow-100 shadow-2xl backdrop-blur">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={exportJobsCsv}
        disabled={isExporting}
        className="rounded-full border border-green-400/30 bg-green-600 px-5 py-3 text-sm font-black text-white shadow-2xl transition hover:bg-green-500 disabled:opacity-60"
      >
        {isExporting ? "جاري تصدير الوظائف..." : "تصدير CSV للوظائف"}
      </button>
    </div>
  );
}
