import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.skip(process.env.PR119_VISUAL_EVIDENCE !== "1", "PR119 visual evidence runs only in its isolated screenshot workflow");

const evidenceDir=process.env.PR119_EVIDENCE_DIR||"artifacts/admin-visual-evidence";
const supabaseHost="https://visual-fixture.supabase.co";
const authStorageKey="sb-visual-fixture-auth-token";

const applications=[
 {id:1,full_name:"ليان محمد",country:"سوريا",whatsapp:"+90 555 100 1001",platform:"TikTok",previous_experience:"خبرة في البث المباشر",notes:null,status:"new",internal_notes:null,created_at:"2026-08-22T07:24:00.000Z"},
 {id:2,full_name:"نورة خالد",country:"تركيا",whatsapp:"+90 555 100 1002",platform:"BIGO LIVE",previous_experience:"مقدمة محتوى",notes:null,status:"new",internal_notes:null,created_at:"2026-08-22T06:15:00.000Z"},
 {id:3,full_name:"سارة علي",country:"سوريا",whatsapp:"+90 555 100 1003",platform:"Yaahlan",previous_experience:null,notes:null,status:"new",internal_notes:null,created_at:"2026-08-21T17:42:00.000Z"},
 {id:4,full_name:"مريم حسن",country:"لبنان",whatsapp:"+961 70 100 104",platform:"TikTok",previous_experience:"صانعة محتوى",notes:null,status:"under_review",internal_notes:null,created_at:"2026-08-21T15:31:00.000Z"},
 {id:5,full_name:"أمل عبدالله",country:"تركيا",whatsapp:"+90 555 100 1005",platform:"BIGO LIVE",previous_experience:null,notes:null,status:"under_review",internal_notes:null,created_at:"2026-08-21T13:12:00.000Z"},
];

const tableCounts={agency_applications:12,service_requests:8,programs:3,pages:12,sections:9,media:24,announcements:2,settings:8,notifications:3,jobs:4,reviews:4,success_stories:6,partners:5,gallery_items:10,blog_posts:18};

function fixtureSession(){return{access_token:"eyJhbGciOiJub25lIn0.eyJzdWIiOiJ2aXN1YWwtb3duZXIiLCJleHAiOjQxMDI0NDQ4MDB9.",refresh_token:"visual-refresh-token",expires_at:4102444800,expires_in:3600,token_type:"bearer",user:{id:"visual-owner",aud:"authenticated",role:"authenticated",email:"owner@hamza-agency.test",email_confirmed_at:"2026-08-01T00:00:00.000Z",app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:"2026-08-01T00:00:00.000Z"}}}

async function installVisualFixture(page){
 await page.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session))},{key:authStorageKey,session:fixtureSession()});
 await page.route(`${supabaseHost}/**`,async route=>{
  const request=route.request();const url=new URL(request.url());const path=url.pathname;const prefer=request.headers()["prefer"]||"";
  if(path.includes("/auth/v1/")){
   if(path.endsWith("/user"))return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixtureSession().user)});
   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixtureSession())});
  }
  if(path.includes("/rest/v1/admin_users"))return route.fulfill({status:200,headers:{"content-type":"application/json"},body:JSON.stringify([{id:1,user_id:"visual-owner",email:"owner@hamza-agency.test",role:"super_admin",assigned_program:null,is_active:true}])});
  const match=path.match(/\/rest\/v1\/([^/]+)/);const table=match?.[1];
  if(table&&(request.method()==="HEAD"||prefer.includes("count=exact"))){
   const count=tableCounts[table]??0;return route.fulfill({status:200,headers:{"content-range":`0-0/${count}`,"range-unit":"items","preference-applied":"count=exact","content-type":"application/json"},body:request.method()==="HEAD"?"":"[]"});
  }
  if(path.includes("/rest/v1/agency_applications"))return route.fulfill({status:200,headers:{"content-type":"application/json"},body:JSON.stringify(applications)});
  return route.fulfill({status:200,headers:{"content-type":"application/json"},body:"[]"});
 });
}

async function openDashboard(page,width,height){
 await page.setViewportSize({width,height});
 await installVisualFixture(page);
 await page.goto("/admin",{waitUntil:"networkidle"});
 await expect(page).toHaveURL(/\/admin$/);
 await expect(page.getByTestId("admin-summary-cards")).toBeVisible();
 await expect(page.getByTestId("admin-recent-applications")).toBeVisible();
 await expect(page.getByTestId("admin-quick-actions")).toBeVisible();
 await expect(page.getByTestId("admin-guidance")).toBeVisible();
 await expect(page.getByText("مرحبًا، لوحة تحكم")).toBeVisible();
 await expect(page.getByTestId("summary-applications")).toContainText("12");
 await expect(page.getByTestId("summary-services")).toContainText("8");
 await expect(page.getByTestId("summary-reviews")).toContainText("4");
}

test.beforeAll(async()=>{await mkdir(evidenceDir,{recursive:true})});

test("desktop owner dashboard evidence",async({page})=>{
 await openDashboard(page,1920,1080);
 await page.screenshot({path:`${evidenceDir}/01-desktop-dashboard-full.png`,fullPage:true});
 await page.screenshot({path:`${evidenceDir}/02-desktop-sidebar-summary.png`});
 await page.getByTestId("admin-recent-applications").scrollIntoViewIfNeeded();
 await page.screenshot({path:`${evidenceDir}/03-desktop-recent-quick-guidance.png`});
});

test("mobile 390 owner dashboard evidence",async({page})=>{
 await openDashboard(page,390,844);
 await page.screenshot({path:`${evidenceDir}/04-mobile-390-top.png`});
 await page.getByTestId("admin-summary-cards").screenshot({path:`${evidenceDir}/05-mobile-390-summary-cards.png`});
 await page.getByTestId("admin-recent-applications").scrollIntoViewIfNeeded();
 await page.screenshot({path:`${evidenceDir}/06-mobile-390-recent-quick.png`});
 await page.getByRole("button",{name:"فتح قائمة لوحة التحكم"}).click();
 await expect(page.getByLabel("قائمة لوحة التحكم على الجوال")).toBeVisible();
 await page.screenshot({path:`${evidenceDir}/07-mobile-390-navigation-open.png`});
});

test("mobile 320 owner dashboard evidence",async({page})=>{
 await openDashboard(page,320,720);
 await page.screenshot({path:`${evidenceDir}/08-mobile-320-dashboard.png`});
 await page.getByRole("button",{name:"فتح قائمة لوحة التحكم"}).click();
 await expect(page.getByLabel("قائمة لوحة التحكم على الجوال")).toBeVisible();
 await page.screenshot({path:`${evidenceDir}/09-mobile-320-navigation-open.png`});
});
