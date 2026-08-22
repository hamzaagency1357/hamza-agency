import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.skip(process.env.PR119_VISUAL_EVIDENCE !== "1", "PR119 visual evidence runs only in its isolated screenshot workflow");

const evidenceDir=process.env.PR119_EVIDENCE_DIR||"artifacts/admin-visual-evidence";
const supabaseHost="https://visual-fixture.supabase.co";
const authStorageKey="sb-visual-fixture-auth-token";
const mobileGroupNames=["العمل اليومي","المحتوى","الإدارة","الإعدادات","متقدم"];

const applications=[
 {id:1,full_name:"ليان محمد",country:"سوريا",whatsapp:"+90 555 100 1001",platform:"TikTok",previous_experience:"خبرة في البث المباشر",notes:null,status:"new",internal_notes:null,created_at:"2026-08-22T07:24:00.000Z"},
 {id:2,full_name:"نورة خالد",country:"تركيا",whatsapp:"+90 555 100 1002",platform:"BIGO LIVE",previous_experience:"مقدمة محتوى",notes:null,status:"new",internal_notes:null,created_at:"2026-08-22T06:15:00.000Z"},
 {id:3,full_name:"سارة علي",country:"سوريا",whatsapp:"+90 555 100 1003",platform:"Yaahlan",previous_experience:null,notes:null,status:"new",internal_notes:null,created_at:"2026-08-21T17:42:00.000Z"},
 {id:4,full_name:"مريم حسن",country:"لبنان",whatsapp:"+961 70 100 104",platform:"TikTok",previous_experience:"صانعة محتوى",notes:null,status:"under_review",internal_notes:null,created_at:"2026-08-21T15:31:00.000Z"},
 {id:5,full_name:"أمل عبدالله",country:"تركيا",whatsapp:"+90 555 100 1005",platform:"BIGO LIVE",previous_experience:null,notes:null,status:"under_review",internal_notes:null,created_at:"2026-08-21T13:12:00.000Z"},
];

const tableCounts={agency_applications:12,service_requests:8,programs:3,pages:12,sections:9,media:24,announcements:2,settings:8,notifications:3,jobs:4,reviews:4,success_stories:6,partners:5,gallery_items:10,blog_posts:18};
const corsHeaders={"access-control-allow-origin":"*","access-control-expose-headers":"Content-Range, Range-Unit, Preference-Applied"};

function fixtureSession(){return{access_token:"eyJhbGciOiJub25lIn0.eyJzdWIiOiJ2aXN1YWwtb3duZXIiLCJleHAiOjQxMDI0NDQ4MDB9.",refresh_token:"visual-refresh-token",expires_at:4102444800,expires_in:3600,token_type:"bearer",user:{id:"visual-owner",aud:"authenticated",role:"authenticated",email:"owner@hamza-agency.test",email_confirmed_at:"2026-08-01T00:00:00.000Z",app_metadata:{provider:"email",providers:["email"]},user_metadata:{},created_at:"2026-08-01T00:00:00.000Z"}}}

async function installVisualFixture(page){
 await page.addInitScript(({key,session})=>{localStorage.setItem(key,JSON.stringify(session))},{key:authStorageKey,session:fixtureSession()});
 await page.route(`${supabaseHost}/**`,async route=>{
  const request=route.request();const url=new URL(request.url());const path=url.pathname;const prefer=request.headers()["prefer"]||"";
  if(path.includes("/auth/v1/")){
   if(path.endsWith("/user"))return route.fulfill({status:200,headers:{...corsHeaders,"content-type":"application/json"},body:JSON.stringify(fixtureSession().user)});
   return route.fulfill({status:200,headers:{...corsHeaders,"content-type":"application/json"},body:JSON.stringify(fixtureSession())});
  }
  if(path.includes("/rest/v1/admin_users"))return route.fulfill({status:200,headers:{...corsHeaders,"content-type":"application/json"},body:JSON.stringify([{id:1,user_id:"visual-owner",email:"owner@hamza-agency.test",role:"super_admin",assigned_program:null,is_active:true}])});
  const match=path.match(/\/rest\/v1\/([^/]+)/);const table=match?.[1];
  if(table&&(request.method()==="HEAD"||prefer.includes("count=exact"))){
   const count=tableCounts[table]??0;return route.fulfill({status:200,headers:{...corsHeaders,"content-range":`0-0/${count}`,"range-unit":"items","preference-applied":"count=exact","content-type":"application/json"},body:request.method()==="HEAD"?"":"[]"});
  }
  if(path.includes("/rest/v1/agency_applications"))return route.fulfill({status:200,headers:{...corsHeaders,"content-type":"application/json"},body:JSON.stringify(applications)});
  return route.fulfill({status:200,headers:{...corsHeaders,"content-type":"application/json"},body:"[]"});
 });
}

async function expectNoHorizontalOverflow(page){
 const dimensions=await page.evaluate(()=>({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport+1);
}

async function expectMenuInFlow(page){
 const trigger=page.getByTestId("admin-mobile-menu-trigger");
 const workspace=page.locator("[data-admin-workspace]").first();
 await expect(trigger).toBeVisible();
 const triggerBox=await trigger.boundingBox();
 const workspaceBox=await workspace.boundingBox();
 expect(triggerBox).not.toBeNull();
 expect(workspaceBox).not.toBeNull();
 expect((triggerBox?.y??0)+(triggerBox?.height??0)).toBeLessThanOrEqual((workspaceBox?.y??0)+1);
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
 await expectNoHorizontalOverflow(page);
 if(width<1024){
  await expect(page.getByTestId("admin-mobile-bar")).toBeVisible();
  await expectMenuInFlow(page);
 }
}

async function openDrawer(page){
 const trigger=page.getByTestId("admin-mobile-menu-trigger");
 await expect(trigger).toBeVisible();
 await trigger.click();
 const drawer=page.getByTestId("admin-mobile-drawer");
 await expect(drawer).toBeVisible();
 await expect(trigger).toHaveAttribute("aria-expanded","true");
 await expect(page.getByTestId("admin-mobile-drawer-close")).toBeFocused();
 return drawer;
}

async function closeDrawer(page){
 await page.getByTestId("admin-mobile-drawer-close").click();
 await expect(page.getByTestId("admin-mobile-drawer")).toHaveCount(0);
 await expect(page.getByTestId("admin-mobile-menu-trigger")).toBeFocused();
}

test.beforeAll(async()=>{await mkdir(evidenceDir,{recursive:true})});

test("mobile 390 final owner evidence",async({page})=>{
 await openDashboard(page,390,844);
 await page.screenshot({path:`${evidenceDir}/01-mobile-390-dashboard-top.png`});
 await page.getByTestId("admin-summary-cards").screenshot({path:`${evidenceDir}/02-mobile-390-summary-cards.png`});
 await page.getByTestId("admin-recent-applications").screenshot({path:`${evidenceDir}/03-mobile-390-latest-requests.png`});
 await page.getByTestId("admin-quick-actions").screenshot({path:`${evidenceDir}/04-mobile-390-quick-actions.png`});

 await page.evaluate(()=>window.scrollTo(0,0));
 await expect(page.getByTestId("admin-mobile-drawer")).toHaveCount(0);
 await page.screenshot({path:`${evidenceDir}/05-mobile-390-drawer-closed.png`});

 const drawer=await openDrawer(page);
 const dailyToggle=drawer.getByRole("button",{name:"العمل اليومي"});
 await expect(dailyToggle).toHaveAttribute("aria-expanded","true");
 await expect(drawer.getByRole("link",{name:"الرئيسية"})).toHaveAttribute("aria-current","page");
 await expect(drawer.locator('a[href^="/admin"]')).toHaveCount(46);
 await page.screenshot({path:`${evidenceDir}/06-mobile-390-drawer-work-daily.png`});

 await dailyToggle.click();
 await expect(dailyToggle).toHaveAttribute("aria-expanded","false");
 const contentToggle=drawer.getByRole("button",{name:"المحتوى"});
 await expect(contentToggle).toHaveAttribute("aria-expanded","false");
 await contentToggle.click();
 await expect(contentToggle).toHaveAttribute("aria-expanded","true");
 await expect(drawer.getByRole("link",{name:"البرامج",exact:true})).toBeVisible();
 await page.screenshot({path:`${evidenceDir}/07-mobile-390-drawer-content-expanded.png`});

 await closeDrawer(page);
 await page.getByTestId("admin-mobile-menu-trigger").click();
 await expect(page.getByTestId("admin-mobile-drawer")).toBeVisible();
});

test("mobile 320 final owner evidence",async({page})=>{
 await openDashboard(page,320,720);
 await page.screenshot({path:`${evidenceDir}/08-mobile-320-dashboard-top.png`});
 await page.getByTestId("admin-summary-cards").screenshot({path:`${evidenceDir}/09-mobile-320-summary-cards.png`});
 const drawer=await openDrawer(page);
 await expect(drawer.getByRole("button",{name:"العمل اليومي"})).toHaveAttribute("aria-expanded","true");
 await page.screenshot({path:`${evidenceDir}/10-mobile-320-drawer-open.png`});
 await expectNoHorizontalOverflow(page);
});

test("mobile 360 drawer interaction regression",async({page})=>{
 await openDashboard(page,360,800);
 const drawer=await openDrawer(page);
 for(const groupName of mobileGroupNames.slice(1)){
  const toggle=drawer.getByRole("button",{name:groupName});
  await expect(toggle).toHaveAttribute("aria-expanded","false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded","true");
 }
 await expect(drawer.locator('a[href^="/admin"]')).toHaveCount(46);
 await drawer.getByRole("link",{name:"فحص الجاهزية"}).scrollIntoViewIfNeeded();
 await expect(drawer.getByRole("link",{name:"فحص الجاهزية"})).toBeVisible();
 await expectNoHorizontalOverflow(page);
 await closeDrawer(page);
});

test("desktop 1366 regression evidence",async({page})=>{
 await openDashboard(page,1366,768);
 await expect(page.getByTestId("admin-mobile-navigation-shell")).toBeHidden();
 await expect(page.getByLabel("التنقل الرئيسي للوحة التحكم")).toBeVisible();
 await page.screenshot({path:`${evidenceDir}/11-desktop-1366-regression.png`,fullPage:false});
});
