import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("the professional LinkedIn URL is defined once, without tracking parameters",()=>{
 const source=read("lib/agentSocialProfiles.ts");
 assert.ok(source.includes("https://www.linkedin.com/in/عراب-سوريا-877625360"));
 assert.doesNotMatch(source,/utm_source|utm_medium|utm_content/);
});
test("the named agent profile links in the agent page and footer for all locales",()=>{
 const agent=read("app/agent/arab-syria/page.tsx");
 const footer=read("components/PublicFooterLinks.tsx");
 for(const source of [agent,footer]){
  assert.ok(source.includes("AGENT_LINKEDIN_PROFILE_URL"));
  assert.ok(source.includes('target="_blank" rel="noopener noreferrer"'));
 }
 for(const text of ["الملف المهني على LinkedIn","Professional LinkedIn profile","LinkedIn profesyonel profili"]){assert.ok(agent.includes(text),text)}
 assert.ok(agent.includes('data-testid="agent-linkedin-profile"'));
 assert.ok(footer.includes('data-testid="footer-agent-linkedin"'));
});
test("LinkedIn describes the Person in structured data and not the agency's corporate social links",()=>{
 const structured=read("components/StructuredData.tsx");
 const footer=read("components/PublicFooterLinks.tsx");
 assert.match(structured,/sameAs: \[AGENT_LINKEDIN_PROFILE_URL\]/);
 assert.ok(structured.indexOf("sameAs: [AGENT_LINKEDIN_PROFILE_URL]")>structured.indexOf("function buildAgent("));
 assert.ok(footer.includes('data-testid="footer-social-instagram"'));
 assert.ok(footer.includes('data-testid="footer-social-facebook"'));
});
