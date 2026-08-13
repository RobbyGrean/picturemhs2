const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sources = {};
["index.html", path.join("public", "index.html")].forEach((file) => {
  const html = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  sources[file] = html;
  const scripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g));
  scripts.forEach((match, index) => new vm.Script(match[1], { filename: `${file}#script-${index + 1}` }));
});

const indexHtml = sources["index.html"];
const appScriptPath = path.join("assets", "js", "app.js");
const appScript = fs.readFileSync(path.join(__dirname, "..", appScriptPath), "utf8");
new vm.Script(appScript, { filename: appScriptPath });
sources["index.html"] = `${indexHtml}\n${appScript}`;

assert.match(indexHtml, /href="\.\/assets\/css\/app\.css"/);
assert.match(indexHtml, /src="\.\/assets\/js\/app\.js"/);
assert.match(appScript, /CATEGORY_COVER_FILES/);
assert.match(appScript, /loading = "lazy"/);
assert.match(appScript, /isSafeDriveThumbnailUrl/);
assert.match(appScript, /chooseCoverFile/);
assert.match(appScript, /coverFileId:/);
assert.match(appScript, /readApiJson/);
assert.match(appScript, /confirmActivityMetadata/);
assert.match(appScript, /isAmbiguousApiResponse/);
assert.match(appScript, /cache:\s*"no-store"/);
assert.match(appScript, /isTransientApiError/);
assert.match(appScript, /timeoutMs:\s*8000,\s*retry:\s*false/);
assert.doesNotMatch(sources["index.html"], /UPLOAD_YEARS/);
assert.match(sources["index.html"], /id="visibility"/);
assert.match(sources["index.html"], /action:\s*"updateActivity"/);
assert.match(sources["index.html"], /action:\s*"archiveActivity"/);
assert.match(sources["index.html"], /เลือกปี พ\.ศ\. ก่อนค้นหา/);
assert.match(sources["index.html"], /className = "btn btn-drive"/);
assert.match(sources["index.html"], /id="btnCloseManage"[^>]*aria-label=/);
assert.match(sources["index.html"], /class="danger-zone"/);
assert.match(sources["index.html"], /event\.key === "Escape"/);
assert.match(sources[path.join("public", "index.html")], /action=publicLatest/);
assert.match(sources[path.join("public", "index.html")], /id="yearBE"[^>]*required/);
assert.match(sources[path.join("public", "index.html")], /\.\.\/assets\/covers\//);
assert.match(sources[path.join("public", "index.html")], /item\.coverUrl/);
assert.match(sources[path.join("public", "index.html")], /id="retryLatestButton"/);
assert.match(sources[path.join("public", "index.html")], /LATEST_RETRY_TIMEOUT_MS:\s*12000/);
assert.match(sources[path.join("public", "index.html")], /isTransientFetchError/);
assert.match(sources[path.join("public", "index.html")], /fetchJsonWithRetry/);
assert.match(sources[path.join("public", "index.html")], /status === 404/);
assert.match(sources[path.join("public", "index.html")], /LATEST_DISPLAY_LIMIT:\s*3/);
assert.match(sources[path.join("public", "index.html")], /BACKGROUND_RETRY_MS:\s*60000/);
assert.match(sources[path.join("public", "index.html")], /action=publicSearch&yearBE=/);
assert.match(sources[path.join("public", "index.html")], /\.slice\(0, CONFIG\.LATEST_DISPLAY_LIMIT\)/);

["activity.svg", "travel.svg", "meeting.svg"].forEach((file) => {
  const svg = fs.readFileSync(path.join(__dirname, "..", "assets", "covers", file), "utf8");
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /viewBox="0 0 320 200"/);
});

const guide = fs.readFileSync(path.join(__dirname, "..", "guide.html"), "utf8");
const guideIds = new Set(Array.from(guide.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));
Array.from(guide.matchAll(/href="#([^"]+)"/g), (match) => match[1]).forEach((anchor) => {
  assert.ok(guideIds.has(anchor), `guide.html: missing #${anchor}`);
});
assert.match(guide, /id="manage-activity"/);
assert.match(guide, /id="visibility-delete"/);
assert.match(guide, /กิจกรรมล่าสุดที่เผยแพร่.*3 รายการ/);
assert.match(guide, /ปุ่ม <strong>×<\/strong>.*<strong>Escape<\/strong>/);

const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
assert.match(readme, /setupActivityManagement\(\)/);
assert.match(readme, /activity_status = active \| archived/);
assert.match(readme, /visibility\s+= public \| internal/);
assert.match(readme, /<div align="center">[\s\S]*<h1>📸 PICMHS2<\/h1>/);
assert.match(readme, /img\.shields\.io\/badge\/STATUS-LIVE-147A45/);
assert.match(readme, /id="overview"/);
assert.match(readme, /id="user-guide"/);
assert.match(readme, /id="installation"/);
assert.match(readme, /id="production-checklist"/);
assert.match(readme, /id="design-system"/);
assert.equal((readme.match(/<div\b/g) || []).length, (readme.match(/<\/div>/g) || []).length, "README.md: unbalanced div tags");
assert.doesNotMatch(readme, /ไม่มี metadata edit\/admin UI|ตัวกรองทุกช่องเป็นตัวเลือก|ปรับ `UPLOAD_YEARS`/);

console.log("frontend_syntax.test.js: frontend assets compile");
