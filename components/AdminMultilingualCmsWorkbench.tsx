"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "ar" | "en" | "tr";
type FieldKey = "title" | "summary" | "content";
type Item = { key:string; sourceType:string; sourceId:string; label:string; preview:string; base:Record<FieldKey,string> };
type Translation = { translated_value:string; reviewed:boolean; is_published:boolean; status:string };
type Pack = Record<string,Partial<Record<Language,Partial<Record<FieldKey,Translation>>>>>;
type Row = Record<string,unknown>;

const languages: {code:Language;label:string}[]=[{code:"ar",label:"العربية"},{code:"en",label:"English"},{code:"tr",label:"Türkçe"}];
const fieldLabels:Record<FieldKey,string>={title:"العنوان",summary:"الملخص",content:"المحتوى"};
const configs=[
 {type:"announcements",table:"announcements",label:"الإعلانات",title:["title"],summary:[],content:["content"],preview:"/"},
 {type:"jobs",table:"jobs",label:"الوظائف",title:["title"],summary:["short_description","department"],content:["description","requirements"],preview:"/jobs"},
 {type:"reviews",table:"reviews",label:"التقييمات",title:["reviewer_name"],summary:["platform","country"],content:["content"],preview:"/reviews"},
 {type:"success_stories",table:"success_stories",label:"قصص النجاح",title:["title","person_name"],summary:["result_summary","results"],content:["story","content"],preview:"/success-stories"},
 {type:"partners",table:"partners",label:"الشركاء",title:["name"],summary:["badge","category"],content:["description"],preview:"/partners"},
 {type:"gallery_items",table:"gallery_items",label:"المعرض",title:["title"],summary:["category","alt_text"],content:["description"],preview:"/gallery"},
 {type:"faqs",table:"faqs",label:"الأسئلة الشائعة",title:["question"],summary:["category"],content:["answer"],preview:"/faq"},
 {type:"knowledge_base",table:"knowledge_base",label:"مركز المعرفة",title:["title"],summary:["excerpt","category"],content:["content"],preview:"/knowledge-center"},
] as const;
const settingKeys=["header_navigation","footer_content","footer_support_text","support_text","global_cta","site_title","site_description","seo_title","seo_description","og_title","og_description"];
function str(row:Row,keys:readonly string[]){for(const key of keys){const value=row[key];if(typeof value==="string"&&value.trim())return value.trim();if(typeof value==="number")return String(value)}return ""}
function href(path:string,language:Language){return language==="ar"?path:`/${language}${path==="/"?"":path}`}
function emptyTranslation(value=""):Translation{return{translated_value:value,reviewed:false,is_published:false,status:"draft"}}

export default function AdminMultilingualCmsWorkbench(){
 const router=useRouter();const[authorized,setAuthorized]=useState(false);const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[items,setItems]=useState<Item[]>([]);const[pack,setPack]=useState<Pack>({});const[selected,setSelected]=useState("");const[language,setLanguage]=useState<Language>("ar");const[filter,setFilter]=useState("all");const[search,setSearch]=useState("");const[message,setMessage]=useState("");
 useEffect(()=>{void(async()=>{const access=await requireAdminModuleAccess("settings");if(!access.isAuthorized){router.replace(access.reason==="forbidden"?"/admin":"/admin/login");return}setAuthorized(true)})()},[router]);
 useEffect(()=>{if(authorized)void load()},[authorized]);
 async function load(){if(!supabase)return;setLoading(true);setMessage("");
  const entityResults=await Promise.all(configs.map((config)=>supabase.from(config.table).select("*").limit(500)));
  const settingsResult=await supabase.from("settings").select("*").in("setting_key",settingKeys).limit(100);
  const loaded:Item[]=[];
  configs.forEach((config,index)=>{for(const row of (entityResults[index].data||[]) as Row[]){const sourceId=String(row.id??"");loaded.push({key:`${config.type}:${sourceId}`,sourceType:config.type,sourceId,label:config.label,preview:config.preview,base:{title:str(row,config.title),summary:str(row,config.summary),content:str(row,config.content)}})}});
  for(const row of (settingsResult.data||[]) as Row[]){const id=String(row.id??row.setting_key??"");const value=str(row,["setting_value"]);loaded.push({key:`settings:${id}`,sourceType:"settings",sourceId:id,label:`الإعدادات — ${str(row,["setting_key"])}`,preview:"/",base:{title:str(row,["label_ar","setting_key"]),summary:str(row,["description"]),content:value}})}
  const translations=await supabase.from("content_translations").select("source_type,source_id,field_name,language,translated_value,status,reviewed,is_published").in("language",["ar","en","tr"]).limit(10000);
  const next:Pack={};for(const item of loaded){next[item.key]={};for(const lang of languages){next[item.key]![lang.code]={};for(const field of Object.keys(fieldLabels) as FieldKey[]){const row=(translations.data||[]).find((candidate)=>candidate.source_type===item.sourceType&&String(candidate.source_id)===item.sourceId&&candidate.field_name===field&&candidate.language===lang.code);next[item.key]![lang.code]![field]=row?{translated_value:row.translated_value||"",reviewed:Boolean(row.reviewed),is_published:Boolean(row.is_published),status:row.status||"draft"}:emptyTranslation(lang.code==="ar"?item.base[field]:"")}}}
  setItems(loaded);setPack(next);setSelected((current)=>loaded.some((item)=>item.key===current)?current:loaded[0]?.key||"");setLoading(false);
 }
 const visible=useMemo(()=>items.filter((item)=>(filter==="all"||item.sourceType===filter)&&(!search.trim()||`${item.label} ${item.base.title} ${item.base.summary}`.toLowerCase().includes(search.toLowerCase()))),[items,filter,search]);
 const item=visible.find((candidate)=>candidate.key===selected)||visible[0];const fields=item?pack[item.key]?.[language]:undefined;
 function update(field:FieldKey,value:string){if(!item)return;setPack((current)=>({...current,[item.key]:{...current[item.key],[language]:{...current[item.key]?.[language],[field]:{...(current[item.key]?.[language]?.[field]||emptyTranslation()),translated_value:value,reviewed:false,is_published:false,status:"draft"}}}}))}
 function complete(lang:Language){if(!item)return false;return (Object.keys(fieldLabels) as FieldKey[]).every((field)=>Boolean(pack[item.key]?.[lang]?.[field]?.translated_value.trim()))}
 async function save(publish=false){if(!supabase||!item)return;if(publish&&!complete(language)){setMessage("لا يمكن نشر ترجمة ناقصة.");return}setSaving(true);setMessage("");const rows=(Object.keys(fieldLabels) as FieldKey[]).map((field)=>({source_type:item.sourceType,source_id:item.sourceId,field_name:field,language,translated_value:pack[item.key]?.[language]?.[field]?.translated_value.trim()||"",status:publish?"published":"draft",reviewed:publish,is_published:publish,updated_at:new Date().toISOString()}));const result=await supabase.from("content_translations").upsert(rows,{onConflict:"source_type,source_id,field_name,language"});setSaving(false);if(result.error){setMessage(`تعذر الحفظ: ${result.error.message}`);return}setMessage(publish?"تم نشر الترجمة المكتملة.":"تم حفظ المسودة.");await load()}
 if(!authorized||loading)return <main dir="rtl" className="min-h-screen bg-[#070009] p-8 text-white">جارٍ تحميل مركز الترجمة...</main>;
 return <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] p-4 text-white md:p-8"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold text-purple-300">CMS AR / EN / TR</p><h1 className="mt-2 text-4xl font-black">مركز المحتوى متعدد اللغات</h1></div><Link href="/admin" className="rounded-full border border-white/10 px-5 py-3">لوحة الإدارة</Link></div>
 <div className="mt-8 grid gap-5 lg:grid-cols-[320px_1fr]"><aside className="rounded-3xl border border-white/10 bg-white/[.04] p-4"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="بحث" className="w-full rounded-2xl border border-white/10 bg-black/30 p-3"/><select value={filter} onChange={(e)=>setFilter(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black p-3"><option value="all">كل الأنواع</option>{configs.map((config)=><option key={config.type} value={config.type}>{config.label}</option>)}<option value="settings">الإعدادات العامة</option></select><div className="mt-4 max-h-[65vh] space-y-2 overflow-auto">{visible.map((candidate)=><button key={candidate.key} onClick={()=>setSelected(candidate.key)} className={`w-full rounded-2xl border p-3 text-right ${candidate.key===item?.key?"border-purple-400 bg-purple-500/15":"border-white/10 bg-black/20"}`}><span className="block text-xs text-white/45">{candidate.label}</span><span className="mt-1 block font-bold">{candidate.base.title||candidate.sourceId}</span></button>)}</div></aside>
 <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5 md:p-7">{item&&<><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-white/45">{item.label}</p><h2 className="text-2xl font-black">{item.base.title||item.sourceId}</h2></div><div className="flex gap-2">{languages.map((lang)=><button key={lang.code} onClick={()=>setLanguage(lang.code)} className={`rounded-full px-4 py-2 font-bold ${language===lang.code?"bg-purple-600":"bg-white/10"}`}>{lang.label} {complete(lang.code)?"✓":"○"}</button>)}</div></div>
 <div className="mt-6 grid gap-5">{(Object.keys(fieldLabels) as FieldKey[]).map((field)=><label key={field}><span className="mb-2 block font-bold">{fieldLabels[field]} — {language.toUpperCase()}</span>{field==="title"?<input value={fields?.[field]?.translated_value||""} onChange={(e)=>update(field,e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 p-4"/>:<textarea value={fields?.[field]?.translated_value||""} onChange={(e)=>update(field,e.target.value)} className="min-h-32 w-full rounded-2xl border border-white/10 bg-black/30 p-4"/>}</label>)}</div>
 <div className="mt-6 flex flex-wrap items-center gap-3"><button disabled={saving} onClick={()=>void save(false)} className="rounded-full border border-purple-400/40 px-6 py-3 font-black">حفظ مسودة</button><button disabled={saving||!complete(language)} onClick={()=>void save(true)} className="rounded-full bg-purple-600 px-6 py-3 font-black disabled:opacity-40">نشر اللغة</button><a target="_blank" rel="noreferrer" href={href(item.preview,language)} className="rounded-full bg-white/10 px-6 py-3 font-bold">معاينة {language.toUpperCase()}</a><span className={`rounded-full px-4 py-2 text-sm ${complete(language)?"bg-green-500/15 text-green-200":"bg-yellow-500/15 text-yellow-100"}`}>{complete(language)?"مكتملة":"ناقصة — النشر ممنوع"}</span></div>{message&&<p className="mt-5 rounded-2xl border border-white/10 p-4">{message}</p>}</>}</section></div></div></main>
}
