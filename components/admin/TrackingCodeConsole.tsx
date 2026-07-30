"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { requireAdminModuleAccess, type AdminModule } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Row={id:number;tracking_code:string|null;full_name:string|null;whatsapp:string|null;email?:string|null;platform?:string|null;status:string|null;created_at:string|null};
type Config={module:AdminModule;table:string;codeColumn:"tracking_code";title:string;select:string};
const configs:Record<"applications"|"jobs",Config>={
 applications:{module:"applications",table:"agency_applications",codeColumn:"tracking_code",title:"بحث وتصدير أرقام APP",select:"id,tracking_code,full_name,whatsapp,platform,status,created_at"},
 jobs:{module:"jobs",table:"job_applications",codeColumn:"tracking_code",title:"بحث وتصدير أرقام JOB",select:"id,tracking_code,full_name,whatsapp,email,status,created_at"},
};
function csv(value:unknown){return `"${String(value??"").replace(/"/g,'""').replace(/\r?\n/g," ")}"`}

export default function TrackingCodeConsole({kind}:{kind:"applications"|"jobs"}){
 const config=configs[kind];const[allowed,setAllowed]=useState(false);const[rows,setRows]=useState<Row[]>([]);const[search,setSearch]=useState("");const[loading,setLoading]=useState(true);const[error,setError]=useState("");
 const load=useCallback(async()=>{if(!supabase||!allowed)return;setLoading(true);const result=await supabase.from(config.table).select(config.select).order("created_at",{ascending:false}).limit(500);setLoading(false);if(result.error){setError("تعذر تحميل أرقام التتبع.");return}setRows((result.data||[])as unknown as Row[])},[allowed,config]);
 useEffect(()=>{void(async()=>{const access=await requireAdminModuleAccess(config.module);if(access.isAuthorized){setAllowed(true)}else setLoading(false)})()},[config.module]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>{const query=search.trim().toLowerCase();return rows.filter((row)=>!query||[row.id,row.tracking_code,row.full_name,row.whatsapp,row.email,row.platform,row.status].join(" ").toLowerCase().includes(query))},[rows,search]);
 function exportCsv(){const headers=["id","tracking_code","full_name","whatsapp","email","platform","status","created_at"];const lines=filtered.map((row)=>[row.id,row.tracking_code,row.full_name,row.whatsapp,row.email,row.platform,row.status,row.created_at].map(csv).join(","));const blob=new Blob(["\uFEFF"+[headers.join(","),...lines].join("\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${kind}-tracking-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)}
 if(!allowed&&!loading)return null;
 return <section dir="rtl" className="mx-auto mb-6 max-w-7xl rounded-[2rem] border border-yellow-400/20 bg-yellow-500/[0.07] p-5 text-white"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-wider text-yellow-200">Tracking Operations</p><h2 className="mt-2 text-2xl font-black">{config.title}</h2></div><button onClick={exportCsv} disabled={filtered.length===0} className="rounded-full bg-green-600 px-5 py-3 font-black disabled:opacity-40">تصدير النتائج</button></div><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="بحث برقم التتبع، الاسم، واتساب، البريد أو الحالة" className="mt-4 w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-yellow-400"/>{error&&<p className="mt-3 text-red-200">{error}</p>}<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="text-right text-yellow-200"><th className="p-3">رقم التتبع</th><th className="p-3">الاسم</th><th className="p-3">التواصل</th><th className="p-3">البرنامج/البريد</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th></tr></thead><tbody>{filtered.map((row)=><tr key={row.id} className="border-t border-white/10"><td dir="ltr" className="p-3 font-mono font-black text-yellow-100">{row.tracking_code||"—"}</td><td className="p-3">{row.full_name||"—"}</td><td dir="ltr" className="p-3">{row.whatsapp||"—"}</td><td className="p-3">{row.platform||row.email||"—"}</td><td className="p-3">{row.status||"—"}</td><td className="p-3">{row.created_at?new Date(row.created_at).toLocaleString("ar"):"—"}</td></tr>)}</tbody></table>{loading&&<p className="py-5 text-center text-white/50">جاري التحميل...</p>}{!loading&&filtered.length===0&&<p className="py-5 text-center text-white/50">لا توجد نتائج.</p>}</div></section>
}
