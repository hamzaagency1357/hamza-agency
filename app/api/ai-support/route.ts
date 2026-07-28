import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type KnowledgeRow={id?:string|number|null;title?:string|null;summary?:string|null;content?:string|null;category?:string|null};
const BUILT_IN_KNOWLEDGE:KnowledgeRow[]=[
 {id:"programs",title:"البرامج المتاحة",summary:"وكالة حمزة تدير برامج ومنصات متعددة لصناع المحتوى.",content:"يمكنك الاطلاع على البرامج من صفحة البرامج. المنصات الحالية تشمل TikTok وBIGO LIVE وYaahlan وXena وCatchii.",category:"برامج"},
 {id:"apply",title:"طريقة الانضمام",summary:"الانضمام يتم عبر نموذج طلب الانضمام الرسمي.",content:"افتح صفحة البرنامج المناسب، املأ البيانات بدقة، ثم تابع حالة الطلب من صفحة التتبع.",category:"انضمام"},
 {id:"services",title:"طلب خدمة رقمية",summary:"يمكن إرسال طلب خدمة رقمية من صفحة طلب الخدمة.",content:"بعد إرسال طلب الخدمة تحصل على كود متابعة يمكنك استخدامه لمعرفة الحالة.",category:"خدمات"},
 {id:"tracking",title:"تتبع الطلبات",summary:"يمكن تتبع طلب الانضمام أو طلب الخدمة.",content:"استخدم رقم واتسابك أو كود الطلب في صفحات التتبع، وتواصل مع الوكالة عند الحاجة.",category:"تتبع"},
 {id:"whatsapp",title:"التواصل الرسمي",summary:"واتساب هو المسار الرسمي للحالات الخاصة.",content:"لا يطلب الدعم الذكي كلمات مرور أو رموز تحقق. الحالات الإدارية الخاصة تُحوّل إلى واتساب الرسمي.",category:"تواصل"},
];
function clean(value:unknown){return typeof value==="string"?value.trim():""}
function normalize(value:string){return value.toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^؀-ۿ\w\s]/g," ").replace(/\s+/g," ").trim()}
function tokens(value:string){return normalize(value).split(" ").filter((token)=>token.length>=3)}
function pick(question:string,rows:KnowledgeRow[]){const questionTokens=tokens(question);const ranked=rows.map((row)=>({row,score:questionTokens.reduce((score,token)=>normalize([row.title,row.summary,row.content,row.category].filter(Boolean).join(" ")).includes(token)?score+1:score,0)})).sort((a,b)=>b.score-a.score);return ranked[0]?.score>0?ranked[0].row:null}
async function loadKnowledge(){if(!isSupabaseConfigured||!supabase)return BUILT_IN_KNOWLEDGE;const{data,error}=await supabase.from("knowledge_base").select("id,title,summary,content,category").eq("is_published",true).limit(120);return error||!data?.length?BUILT_IN_KNOWLEDGE:[...(data as KnowledgeRow[]),...BUILT_IN_KNOWLEDGE]}
export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>({}));const question=clean((body as Record<string,unknown>).question);
 if(question.length<3)return NextResponse.json({ok:false,message:"اكتب سؤالاً واضحاً قبل الإرسال."},{status:400});
 const knowledge=pick(question,await loadKnowledge());
 if(!knowledge)return NextResponse.json({ok:true,answer:"لم أجد إجابة مؤكدة داخل قاعدة المعرفة الحالية. تم حفظ سؤالك ليراجعه فريق وكالة حمزة، وللحالات المستعجلة تواصل عبر واتساب الرسمي.",status:"unanswered",source:"unanswered",escalated:true});
 const content=clean(knowledge.content)||clean(knowledge.summary)||clean(knowledge.title);
 return NextResponse.json({ok:true,answer:content.length>900?`${content.slice(0,900)}...`:content,status:"answered",source:clean(knowledge.category)||"knowledge_base",escalated:false});
}
