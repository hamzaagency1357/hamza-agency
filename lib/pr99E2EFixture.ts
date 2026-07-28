import "server-only";

type Locale="ar"|"en"|"tr";
type FixturePage={slug:string;status:"draft"|"published"|"unpublished";translations:Record<Locale,string>;sections:Array<{id:string;title:string;visible:boolean}>;versions:number;notifications:number;trash:"empty"|"trashed"|"restored"|"deleted";backups:number;lastError:string|null};
type FixtureState={authenticated:boolean;page:FixturePage;submissions:string[];rateKeys:Set<string>;activity:string[]};

declare global { var __pr99E2EState: FixtureState|undefined; }

function fresh():FixtureState{return{authenticated:false,page:{slug:"fixture-page",status:"draft",translations:{ar:"محتوى عربي تجريبي",en:"Isolated English fixture content",tr:"Yalıtılmış Türkçe test içeriği"},sections:[],versions:0,notifications:0,trash:"empty",backups:0,lastError:null},submissions:[],rateKeys:new Set(),activity:[]}}
export function fixtureToken(){return process.env.PR99_E2E_TOKEN||""}
export function fixtureEnabled(){return process.env.PR99_E2E_MODE==="1"&&fixtureToken().length>=32}
export function fixtureState(){globalThis.__pr99E2EState??=fresh();return globalThis.__pr99E2EState}
export function resetFixture(){globalThis.__pr99E2EState=fresh();return globalThis.__pr99E2EState}
export function publicFixture(locale:Locale,slug:string){const state=fixtureState();if(state.page.status!=="published"||state.page.slug!==slug)return null;return{locale,slug,title:state.page.translations[locale],sections:state.page.sections.filter(section=>section.visible)}}