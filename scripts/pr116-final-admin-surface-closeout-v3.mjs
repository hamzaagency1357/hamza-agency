import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
execFileSync(process.execPath, [path.join(ROOT, "scripts/pr116-final-admin-surface-closeout-v2.mjs")], { stdio: "inherit" });

const file = path.join(ROOT, "components/AdminReviewSubmissionsPanel.tsx");
let source = fs.readFileSync(file, "utf8");
const before = 'if(result.error){setMessage("تعذر حفظ إعداد نموذج التقييم.");return}setSettingId(Number(result.data.id));setMessage("تم حفظ إعداد نموذج التقييم.")';
const after = 'if(result.error||!result.data){setMessage("تعذر حفظ إعداد نموذج التقييم.");return}setSettingId(Number(result.data.id));setMessage("تم حفظ إعداد نموذج التقييم.")';
if (!source.includes(before)) throw new Error("review config null-safety marker missing");
source = source.replace(before, after);
fs.writeFileSync(file, source);
console.log("PR116 v3 type-safety patch applied.");
