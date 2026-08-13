const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const headers = [
  "upload_id", "activity_key", "category", "year_be", "month", "day",
  "activity_name", "folder_path", "folder_id", "folder_url", "uploaded_by",
  "uploaded_by_name", "file_count", "uploaded_at", "updated_at",
  "last_uploaded_by", "activity_status", "visibility", "cover_file_id"
];

function activityRow(index, overrides = {}) {
  const values = {
    upload_id: `upload-${index}`,
    activity_key: `activity-${index}`,
    category: "ประชุม",
    year_be: 2569,
    month: 7,
    day: (index % 28) + 1,
    activity_name: `ประชุมครั้งที่ ${index}`,
    folder_path: `private/path/${index}`,
    folder_id: `folder-${index}`,
    folder_url: `https://drive.google.com/drive/folders/folder-${index}`,
    uploaded_by: `uploader${index}@example.com`,
    uploaded_by_name: `Uploader ${index}`,
    file_count: index,
    uploaded_at: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    updated_at: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T01:00:00Z`,
    last_uploaded_by: `last${index}@example.com`,
    activity_status: "active",
    visibility: "public",
    cover_file_id: `cover-${index}`,
    ...overrides
  };
  return headers.map((header) => values[header]);
}

function createContext(rows) {
  const context = {
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(content) {
        return {
          content,
          setMimeType() { return this; },
          getContentText() { return this.content; }
        };
      }
    },
    Utilities: { formatDate: () => "2026" },
    console
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "starter", "Code.gs"), "utf8");
  vm.runInContext(source, context, { filename: "starter/Code.gs" });
  context.getUploadsSheet = () => ({
    getDataRange: () => ({ getValues: () => rows })
  });
  return context;
}

function callGet(context, parameter) {
  return JSON.parse(context.doGet({ parameter }).getContentText());
}

function callPost(context, payload) {
  return JSON.parse(context.doPost({ postData: { contents: JSON.stringify(payload) } }).getContentText());
}

const rows = [headers];
for (let index = 1; index <= 60; index += 1) rows.push(activityRow(index));
rows.push(activityRow(61, { activity_status: "inactive", activity_name: "ห้ามเผยแพร่" }));
rows.push(activityRow(62, { visibility: "internal", activity_name: "กิจกรรมภายใน" }));
rows.push(activityRow(63, { visibility: "", activity_name: "กิจกรรมเดิมก่อน migration" }));

const context = createContext(rows);

const publicResult = callGet(context, {
  action: "publicSearch",
  yearBE: "2569",
  month: "7",
  activityName: "ประชุม"
});
assert.equal(publicResult.ok, true);
assert.equal(publicResult.results.length, 50);
assert.equal(publicResult.truncated, true);
assert.equal(publicResult.results.some((item) => item.activityName === "ห้ามเผยแพร่"), false);
assert.equal(publicResult.results.some((item) => item.activityName === "กิจกรรมภายใน"), false);
assert.deepEqual(
  Object.keys(publicResult.results[0]).sort(),
  ["activityKey", "activityName", "category", "coverUrl", "day", "fileCount", "folderUrl", "month", "updatedAt", "yearBE"].sort()
);
assert.match(publicResult.results[0].coverUrl, /^https:\/\/drive\.google\.com\/thumbnail\?id=cover-\d+&sz=w640$/);
assert.equal(JSON.stringify(publicResult).includes("@example.com"), false);
assert.equal(JSON.stringify(publicResult).includes("private/path"), false);
assert.equal(JSON.stringify(publicResult).includes("folderId"), false);
assert.equal(JSON.stringify(publicResult).includes("coverFileId"), false);

const emptyResult = callGet(context, { action: "publicSearch" });
assert.equal(emptyResult.ok, false);
assert.match(emptyResult.error, /^invalid public search:/);

const latestResult = callGet(context, { action: "publicLatest" });
assert.equal(latestResult.ok, true);
assert.equal(latestResult.results.length, 3);
assert.equal(latestResult.truncated, true);
assert.equal(JSON.stringify(latestResult).includes("กิจกรรมภายใน"), false);

const legacyVisibility = callGet(context, { action: "publicSearch", yearBE: "2569", activityName: "กิจกรรมเดิมก่อน migration" });
assert.equal(legacyVisibility.ok, true);
assert.equal(legacyVisibility.results.length, 1);

const exactResult = callGet(context, {
  action: "publicSearch",
  yearBE: "2569",
  day: "2",
  category: "ประชุม",
  activityName: "ประชุมครั้งที่ 1"
});
assert.equal(exactResult.ok, true);
assert.equal(exactResult.results.length, 1);
assert.equal(exactResult.results[0].activityName, "ประชุมครั้งที่ 1");

const invalidMonth = callGet(context, { action: "publicSearch", yearBE: "2569", month: "13" });
assert.equal(invalidMonth.ok, false);
assert.match(invalidMonth.error, /^invalid public search:/);

const invalidDay = callGet(context, { action: "publicSearch", yearBE: "2569", day: "32" });
assert.equal(invalidDay.ok, false);
assert.match(invalidDay.error, /^invalid public search:/);

const invalidText = callGet(context, { action: "publicSearch", yearBE: "2569", activityName: "ก".repeat(101) });
assert.equal(invalidText.ok, false);
assert.match(invalidText.error, /^invalid public search:/);

const protectedSearch = callGet(context, { action: "search" });
assert.deepEqual(protectedSearch, { ok: false, error: "missing idToken" });
assert.deepEqual(callGet(context, { action: "getAllowedUsers" }), { ok: false, error: "missing idToken" });

["init", "createFolder", "saveMetadata", "appendMetadata", "updateActivity", "archiveActivity", "restoreActivity", "saveAllowedUser", "setAllowedUserActive"].forEach((action) => {
  assert.deepEqual(callPost(context, { action }), { ok: false, error: "missing idToken" });
});

context.getUploadsSheet = () => { throw new Error("sensitive spreadsheet detail"); };
assert.deepEqual(
  callGet(context, { action: "publicSearch", yearBE: "2569" }),
  { ok: false, error: "public search unavailable" }
);

console.log("public_search.test.js: all assertions passed");
