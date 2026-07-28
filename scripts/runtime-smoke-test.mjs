const base=(process.env.E2E_BASE_URL||process.env.VERCEL_URL||"http://127.0.0.1:3000").replace(/\/$/,"");
const origin=base.startsWith("http")?base:`https://${base}`;
const publicPaths=["/","/en","/tr","/programs","/en/programs","/tr/programs","/services","/contact","/application-status","/service-status","/privacy-policy"];
const adminPaths=["/admin","/admin/page-builder","/admin/version-history","/admin/notifications","/admin/activity-logs","/admin/trash","/admin/backups","/admin/system-health","/admin/permissions"];
const failures=[];
async function check(path,{admin=false}={}){try{const response=await fetch(origin+path,{redirect:"manual",headers:{"user-agent":"HAMZA-PR99-QA"}});if(response.status>=500)failures.push(`${path}: ${response.status}`);if(admin&&response.status<300){const text=await response.text();if(!/login|تسجيل|جاري التحقق|صلاحيات/i.test(text))failures.push(`${path}: unauthenticated admin route returned public content`);}const body=admin?"":await response.text();if(!admin&&/placeholder|lorem ipsum|undefined|null null/i.test(body))failures.push(`${path}: placeholder-like content`);if(!admin&&body.includes("SUPABASE_SERVICE_ROLE"))failures.push(`${path}: secret name leaked`);}catch(error){failures.push(`${path}: ${error instanceof Error?error.message:String(error)}`);}}
for(const path of publicPaths)await check(path);for(const path of adminPaths)await check(path,{admin:true});
if(failures.length){console.error(failures.join("\n"));process.exit(1);}console.log(`Runtime smoke passed for ${publicPaths.length+adminPaths.length} routes at ${origin}`);
