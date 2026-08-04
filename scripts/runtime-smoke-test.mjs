const base=(process.env.E2E_BASE_URL||process.env.VERCEL_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const origin=base.startsWith("http")?base:`https://${base}`;
const publicPaths=[
  "/","/en","/tr","/programs","/en/programs","/tr/programs","/services","/contact",
  "/application-status","/service-status","/privacy-policy","/cookie-policy","/ai-policy",
  "/marketplace","/offline","/status","/portal/login","/manifest.webmanifest","/sw.js"
];
const adminPaths=[
  "/admin","/admin/page-builder","/admin/version-history","/admin/notifications","/admin/activity-logs",
  "/admin/trash","/admin/backups","/admin/system-health","/admin/permissions","/admin/product-expansion",
  "/admin/product-operations","/admin/product-analytics"
];
const portalPaths=[
  "/portal/creator","/portal/creator/profile","/portal/client","/portal/client/orders",
  "/portal/employee","/portal/employee/tasks","/portal/partner","/portal/partner/reports"
];
const failures=[];
const placeholderPatterns=[/lorem ipsum/i,/localized content is being updated/i,/yerelleştirilmiş içerik güncelleniyor/i,/\bTODO_PLACEHOLDER\b/i,/\[placeholder\]/i];

async function checkPublic(path){
  try{
    const response=await fetch(origin+path,{redirect:"manual",headers:{"user-agent":"HAMZA-PR101-QA"}});
    if(response.status>=500){failures.push(`${path}: ${response.status}`);return}
    const contentType=response.headers.get("content-type")||"";
    const body=await response.text();
    if(path==="/manifest.webmanifest"){
      if(response.status!==200||!contentType.includes("json"))failures.push(`${path}: invalid manifest response ${response.status} ${contentType}`);
      else try{const manifest=JSON.parse(body);if(manifest.display!=="standalone"||!Array.isArray(manifest.icons)||manifest.icons.length<2)failures.push(`${path}: incomplete installable manifest`)}catch{failures.push(`${path}: malformed JSON`)}
      return;
    }
    if(path==="/sw.js"){
      if(response.status!==200||!body.includes("NEVER_CACHE")||!body.includes("/portal")||!body.includes("/admin"))failures.push(`${path}: privacy-safe service worker evidence missing`);
      return;
    }
    if(response.status>=300&&response.status<400){failures.push(`${path}: unexpected public redirect ${response.headers.get("location")||""}`);return}
    for(const pattern of placeholderPatterns)if(pattern.test(body))failures.push(`${path}: placeholder-like content`);
    if(body.includes("SUPABASE_SERVICE_ROLE"))failures.push(`${path}: secret name leaked`);
    if(!/<html/i.test(body))failures.push(`${path}: HTML document missing`);
  }catch(error){failures.push(`${path}: ${error instanceof Error?error.message:String(error)}`)}
}

async function checkAdmin(path){
  try{
    const response=await fetch(origin+path,{redirect:"manual",headers:{"user-agent":"HAMZA-PR101-QA"}});
    if(response.status>=500){failures.push(`${path}: ${response.status}`);return}
    const body=await response.text();
    if(response.status>=300&&response.status<400){
      const location=response.headers.get("location")||"";
      if(!location.includes("/admin/login"))failures.push(`${path}: unexpected redirect ${location}`);
    }else if(!/admin|الإدارة|الصلاحيات|جاري التحقق|تسجيل الدخول|حالة النظام|النسخ الاحتياطي|المحذوفات|الإشعارات|المستأجر|التشغيل|التحليلات/i.test(body)){
      failures.push(`${path}: admin shell or guard marker missing`);
    }
  }catch(error){failures.push(`${path}: ${error instanceof Error?error.message:String(error)}`)}
}

async function checkPortal(path){
  try{
    const response=await fetch(origin+path,{redirect:"manual",headers:{"user-agent":"HAMZA-PR101-QA"}});
    if(response.status>=500){failures.push(`${path}: ${response.status}`);return}
    if(response.status>=300&&response.status<400){
      const location=response.headers.get("location")||"";
      if(!location.includes("/portal/login"))failures.push(`${path}: unexpected portal redirect ${location}`);
      return;
    }
    const body=await response.text();
    if(!/جارٍ التحقق|جارٍ التحميل|تسجيل الدخول|بوابة التشغيل|الحساب غير مصرح/i.test(body))failures.push(`${path}: signed-out portal guard marker missing`);
    if(body.includes("SUPABASE_SERVICE_ROLE"))failures.push(`${path}: secret name leaked`);
  }catch(error){failures.push(`${path}: ${error instanceof Error?error.message:String(error)}`)}
}

for(const path of publicPaths)await checkPublic(path);
for(const path of adminPaths)await checkAdmin(path);
for(const path of portalPaths)await checkPortal(path);
if(failures.length){console.error(failures.join("\n"));process.exit(1)}
console.log(`Runtime smoke passed for ${publicPaths.length+adminPaths.length+portalPaths.length} PR101 routes at ${origin}`);
