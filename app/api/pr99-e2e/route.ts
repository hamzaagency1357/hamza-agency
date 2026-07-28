import "server-only";
import { NextResponse,type NextRequest } from "next/server";
import { fixtureEnabled,fixtureState,fixtureToken,resetFixture } from "@/lib/pr99E2EFixture";

export const runtime="nodejs";export const dynamic="force-dynamic";
function denied(){return NextResponse.json({ok:false,code:"not_found"},{status:404})}
function auth(request:NextRequest){return fixtureEnabled()&&fixtureToken()&&request.headers.get("x-pr99-e2e-token")===fixtureToken()}
export async function GET(request:NextRequest){if(!auth(request))return denied();const state=fixtureState();return NextResponse.json({ok:true,state:{...state,rateKeys:[...state.rateKeys]}})}
export async function POST(request:NextRequest){if(!auth(request))return denied();const body=await request.json().catch(()=>({}));const action=typeof body.action==="string"?body.action:"";const state=fixtureState();
 if(action==="reset")return NextResponse.json({ok:true,state:resetFixture()});
 if(action==="login"){state.authenticated=true;state.activity.push("admin_login");}
 else if(!state.authenticated)return NextResponse.json({ok:false,code:"unauthorized"},{status:401});
 else if(action==="draft"){state.page.status="draft";state.activity.push("page_draft_created");}
 else if(action==="translations"){state.page.translations={ar:"محتوى عربي تجريبي",en:"Isolated English fixture content",tr:"Yalıtılmış Türkçe test içeriği"};state.activity.push("translations_saved");}
 else if(action==="sections"){state.page.sections=[{id:"hero",title:"Hero",visible:true},{id:"hidden",title:"Hidden",visible:false},{id:"copy",title:"Duplicate",visible:true}];state.activity.push("sections_reordered_hidden_duplicated");}
 else if(action==="publish"){state.page.status="published";state.page.versions+=1;state.page.notifications+=1;state.activity.push("page_published");}
 else if(action==="restore"){state.page.status="draft";state.page.versions+=1;state.activity.push("version_restored_to_draft");}
 else if(action==="unpublish"){state.page.status="unpublished";state.page.notifications+=1;state.activity.push("page_unpublished");}
 else if(action==="submit"){const kind=String(body.kind||"");const key=String(body.key||kind);if(state.rateKeys.has(key))return NextResponse.json({ok:false,code:"duplicate"},{status:429});state.rateKeys.add(key);state.submissions.push(kind);state.page.notifications+=1;state.activity.push(`${kind}_submitted`);}
 else if(action==="mark_all_read"){state.page.notifications=0;state.activity.push("notifications_marked_read");}
 else if(action==="trash"){state.page.trash="trashed";state.activity.push("fixture_trashed");}
 else if(action==="restore_trash"){if(state.page.trash!=="trashed")return NextResponse.json({ok:false,code:"invalid_state"},{status:409});state.page.trash="restored";state.activity.push("fixture_restored");}
 else if(action==="permanent_delete"){if(body.confirmation!=="DELETE PERMANENTLY"||state.page.trash!=="trashed")return NextResponse.json({ok:false,code:"protected"},{status:409});state.page.trash="deleted";state.activity.push("fixture_permanently_deleted");}
 else if(action==="backup"){state.page.backups+=1;state.activity.push("backup_created");}
 else if(action==="dry_run"){if(body.checksum!=="valid-fixture-checksum")return NextResponse.json({ok:false,code:"invalid_checksum"},{status:422});state.activity.push("backup_dry_run_valid");}
 else if(action==="fixture_restore"){state.page.status="draft";state.activity.push("fixture_restore_completed");}
 else return NextResponse.json({ok:false,code:"unknown_action"},{status:400});
 return NextResponse.json({ok:true,state:{...state,rateKeys:[...state.rateKeys]}})}
