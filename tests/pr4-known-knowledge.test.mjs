import assert from "node:assert/strict";
import test from "node:test";
import { findPublishedKnowledgeAnswer } from "../lib/server/pr4Knowledge.ts";

const now=new Date("2026-08-08T12:00:00Z");
const base={language:"ar",category:"programs",source_label:"قاعدة المعرفة المنشورة",priority:20,status:"published",start_at:"2026-08-01T00:00:00Z",expires_at:"2026-09-01T00:00:00Z"};

test("published known knowledge is answered from the active KB",()=>{
 const rows=[{...base,question:"ما هي شروط الانضمام للبرنامج؟",answer:"الشروط المنشورة المعتمدة.",alternatives:["شروط الانضمام"],keywords:["شروط","انضمام"]}];
 const match=findPublishedKnowledgeAnswer(rows,"شو شروط الانضمام؟","ar",now);
 assert.equal(match?.answer,"الشروط المنشورة المعتمدة.");
});

test("unknown knowledge does not manufacture an answer",()=>{
 const rows=[{...base,question:"ما هي شروط الانضمام للبرنامج؟",answer:"الشروط المنشورة المعتمدة.",alternatives:[],keywords:["شروط","انضمام"]}];
 assert.equal(findPublishedKnowledgeAnswer(rows,"كم سعر تذكرة السفر إلى القمر؟","ar",now),null);
});

test("draft, future and expired knowledge are never selected",()=>{
 const rows=[
  {...base,status:"draft",question:"سؤال معروف",answer:"مسودة",alternatives:[],keywords:["معروف"]},
  {...base,start_at:"2026-08-09T00:00:00Z",question:"سؤال معروف",answer:"مستقبلي",alternatives:[],keywords:["معروف"]},
  {...base,expires_at:"2026-08-07T00:00:00Z",question:"سؤال معروف",answer:"منتهي",alternatives:[],keywords:["معروف"]},
 ];
 assert.equal(findPublishedKnowledgeAnswer(rows,"سؤال معروف","ar",now),null);
});

test("English and Turkish matching respects locale",()=>{
 const en=[{...base,language:"en",question:"What are the joining requirements?",answer:"Published requirements",alternatives:["joining requirements"],keywords:["joining","requirements"]}];
 const tr=[{...base,language:"tr",question:"Programa katılım şartları nelerdir?",answer:"Yayınlanmış koşullar",alternatives:["katılım şartları"],keywords:["katılım","şartları"]}];
 assert.equal(findPublishedKnowledgeAnswer(en,"joining requirements","en",now)?.answer,"Published requirements");
 assert.equal(findPublishedKnowledgeAnswer(tr,"katılım şartları","tr",now)?.answer,"Yayınlanmış koşullar");
});
