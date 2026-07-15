const CONFIG = {
  ROOT_FOLDER_ID: "REPLACE_WITH_DRIVE_ROOT_FOLDER_ID",
  METADATA_SHEET_ID: "REPLACE_WITH_METADATA_SPREADSHEET_ID",
  SHEET_UPLOADS: "uploads",
  SHEET_ALLOWED_USERS: "allowed_users",
  PUBLIC_SEARCH_LIMIT: 50,
  PUBLIC_EMPTY_SEARCH_LIMIT: 10,
  PUBLIC_YEAR_MIN: 2500,
  PUBLIC_YEAR_MAX: 2700,
  PUBLIC_ACTIVITY_NAME_MAX_LENGTH: 100,
  MONTHS_TH: ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
  CATEGORIES: ["กิจกรรมและอื่นๆ", "ไปราชการ", "ประชุม"],
  ADMIN_EMAILS: ["owner@example.com", "backup-admin@example.com"]
};

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "health";

    if (action === "publicSearch") {
      try {
        return handlePublicSearch(params);
      } catch (error) {
        const message = String(error.message || "");
        if (message.indexOf("invalid public search: ") === 0) return fail(message);
        return fail("public search unavailable");
      }
    }

    const identity = requireIdentity(params.idToken);
    if (action === "health") return ok({ message: "PICMHS2 API running" });
    if (action === "getYears") return handleGetYears(identity);
    if (action === "search") return handleSearch(identity, params);

    return fail("unknown action");
  } catch (error) {
    return fail(error.message);
  }
}

function handlePublicSearch(params) {
  const filters = validatePublicSearchParams(params);
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ results: [], truncated: false });

  const header = mapHeader(rows[0]);
  let results = rows.slice(1).map(function(row) {
    return {
      activityKey: row[header.activity_key],
      category: row[header.category],
      yearBE: row[header.year_be],
      month: row[header.month],
      day: row[header.day],
      activityName: row[header.activity_name],
      folderUrl: row[header.folder_url],
      fileCount: row[header.file_count],
      updatedAt: row[header.updated_at],
      activityStatus: row[header.activity_status]
    };
  }).filter(function(item) {
    if (String(item.activityStatus || "").toLowerCase() !== "active") return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.yearBE && String(item.yearBE) !== filters.yearBE) return false;
    if (filters.month && String(item.month) !== filters.month) return false;
    if (filters.day && String(item.day) !== filters.day) return false;
    if (filters.activityName && !containsText(item.activityName, filters.activityName)) return false;
    return true;
  });

  results.sort(compareActivityDescending);
  const limit = filters.hasMeaningfulFilter ? CONFIG.PUBLIC_SEARCH_LIMIT : CONFIG.PUBLIC_EMPTY_SEARCH_LIMIT;
  const truncated = results.length > limit;

  return ok({
    results: results.slice(0, limit).map(function(item) {
      return {
        activityKey: item.activityKey,
        category: item.category,
        yearBE: item.yearBE,
        month: item.month,
        day: item.day,
        activityName: item.activityName,
        folderUrl: item.folderUrl,
        fileCount: item.fileCount,
        updatedAt: item.updatedAt
      };
    }),
    truncated: truncated
  });
}

function validatePublicSearchParams(params) {
  const yearBE = normalizePublicSearchText(params.yearBE);
  const month = normalizePublicSearchText(params.month);
  const day = normalizePublicSearchText(params.day);
  const category = normalizePublicSearchText(params.category);
  const activityName = normalizePublicSearchText(params.activityName);

  if (yearBE && (!/^\d{4}$/.test(yearBE) || Number(yearBE) < CONFIG.PUBLIC_YEAR_MIN || Number(yearBE) > CONFIG.PUBLIC_YEAR_MAX)) {
    throw new Error("invalid public search: yearBE must be between " + CONFIG.PUBLIC_YEAR_MIN + " and " + CONFIG.PUBLIC_YEAR_MAX);
  }
  if (month && (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12)) {
    throw new Error("invalid public search: month must be between 1 and 12");
  }
  if (day && (!/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31)) {
    throw new Error("invalid public search: day must be between 1 and 31");
  }
  if (category && CONFIG.CATEGORIES.indexOf(category) === -1) {
    throw new Error("invalid public search: unknown category");
  }
  if (activityName.length > CONFIG.PUBLIC_ACTIVITY_NAME_MAX_LENGTH) {
    throw new Error("invalid public search: activityName is too long");
  }

  return {
    yearBE: yearBE,
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : "",
    category: category,
    activityName: activityName,
    hasMeaningfulFilter: Boolean(yearBE || month || day || category || activityName)
  };
}

function normalizePublicSearchText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").substring(0, CONFIG.PUBLIC_ACTIVITY_NAME_MAX_LENGTH + 1);
}

function compareActivityDescending(a, b) {
  if (Number(a.yearBE) !== Number(b.yearBE)) return Number(b.yearBE) - Number(a.yearBE);
  if (Number(a.month) !== Number(b.month)) return Number(b.month) - Number(a.month);
  if (Number(a.day) !== Number(b.day)) return Number(b.day) - Number(a.day);
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const identity = requireIdentity(payload.idToken);
    const action = payload.action || "";

    if (action === "init") return handleInit(identity);
    if (action === "createFolder") return handleCreateFolder(identity, payload);
    if (action === "saveMetadata") return handleSaveMetadata(identity, payload);
    if (action === "appendMetadata") return handleAppendMetadata(identity, payload);

    return fail("unknown action");
  } catch (error) {
    return fail(error.message);
  }
}

function handleInit(identity) {
  ensureAllowed(identity.email);
  ensureAllowedUsersHeader(getAllowedUsersSheet());
  ensureUploadsHeader(getUploadsSheet());
  return ok({
    userEmail: identity.email,
    userName: identity.name || "",
    role: isAdmin(identity.email) ? "admin" : "user"
  });
}

function handleCreateFolder(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["category", "yearBE", "month", "day", "activityName"]);
  if (CONFIG.CATEGORIES.indexOf(payload.category) === -1) throw new Error("invalid category");

  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const yearName = String(payload.yearBE);
  const monthName = pad2(payload.month) + "_" + CONFIG.MONTHS_TH[Number(payload.month)];
  const dayName = pad2(payload.day);
  const activityName = sanitizeName(payload.activityName);

  const categoryFolder = getOrCreateFolder(root, payload.category);
  const yearFolder = getOrCreateFolder(categoryFolder, yearName);
  const monthFolder = getOrCreateFolder(yearFolder, monthName);
  const dayFolder = getOrCreateFolder(monthFolder, dayName);
  const activityFolder = getOrCreateFolder(dayFolder, activityName);

  return ok({
    folderId: activityFolder.getId(),
    folderUrl: activityFolder.getUrl(),
    folderPath: [payload.category, yearName, monthName, dayName, activityName].join("/")
  });
}

function handleSaveMetadata(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, [
    "category", "yearBE", "month", "day", "activityName",
    "folderId", "folderUrl", "folderPath", "fileCount"
  ]);

  const sheet = getUploadsSheet();
  ensureUploadsHeader(sheet);
  sheet.appendRow([
    Utilities.getUuid(),
    buildActivityKey(payload),
    payload.category,
    Number(payload.yearBE),
    Number(payload.month),
    Number(payload.day),
    payload.activityName,
    payload.folderPath,
    payload.folderId,
    payload.folderUrl,
    identity.email,
    identity.name || payload.userName || "",
    Number(payload.fileCount),
    new Date().toISOString(),
    new Date().toISOString(),
    identity.email,
    "active"
  ]);

  return ok({ saved: true });
}

function handleAppendMetadata(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["folderId", "fileCountDelta"]);

  const sheet = getUploadsSheet();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) throw new Error("uploads sheet is empty");

  const header = mapHeader(rows[0]);
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][header.folder_id]) === String(payload.folderId)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) throw new Error("target activity not found");

  const fileCountCol = header.file_count + 1;
  const updatedAtCol = header.updated_at + 1;
  const lastUploadedByCol = header.last_uploaded_by + 1;

  const currentCount = Number(sheet.getRange(rowIndex, fileCountCol).getValue() || 0);
  sheet.getRange(rowIndex, fileCountCol).setValue(currentCount + Number(payload.fileCountDelta));
  sheet.getRange(rowIndex, updatedAtCol).setValue(new Date().toISOString());
  sheet.getRange(rowIndex, lastUploadedByCol).setValue(identity.email);

  return ok({ updated: true });
}

function handleSearch(identity, params) {
  ensureAllowed(identity.email);
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ results: [] });

  const header = mapHeader(rows[0]);
  let results = rows.slice(1).map(function(row) {
    return {
      uploadId: row[header.upload_id],
      activityKey: row[header.activity_key],
      category: row[header.category],
      yearBE: row[header.year_be],
      month: row[header.month],
      day: row[header.day],
      activityName: row[header.activity_name],
      folderPath: row[header.folder_path],
      folderId: row[header.folder_id],
      folderUrl: row[header.folder_url],
      uploadedBy: row[header.uploaded_by],
      uploadedByName: row[header.uploaded_by_name],
      fileCount: row[header.file_count],
      uploadedAt: row[header.uploaded_at],
      updatedAt: row[header.updated_at],
      lastUploadedBy: row[header.last_uploaded_by],
      activityStatus: row[header.activity_status]
    };
  }).filter(function(item) {
    if (item.activityStatus && item.activityStatus !== "active") return false;
    if (params.category && item.category !== params.category) return false;
    if (params.yearBE && String(item.yearBE) !== String(params.yearBE)) return false;
    if (params.month && String(item.month) !== String(params.month)) return false;
    if (params.day && String(item.day) !== String(params.day)) return false;
    if (params.activityName && !containsText(item.activityName, params.activityName)) return false;
    if (params.uploadedByName && !containsText(item.uploadedByName, params.uploadedByName)) return false;
    return true;
  });

  results.sort(function(a, b) {
    if (Number(a.yearBE) !== Number(b.yearBE)) return Number(b.yearBE) - Number(a.yearBE);
    if (Number(a.month) !== Number(b.month)) return Number(b.month) - Number(a.month);
    if (Number(a.day) !== Number(b.day)) return Number(b.day) - Number(a.day);
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  return ok({ results: results });
}

function handleGetYears(identity) {
  ensureAllowed(identity.email);
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ years: [] });

  const header = mapHeader(rows[0]);
  const years = {};
  rows.slice(1).forEach(function(row) {
    years[row[header.year_be]] = true;
  });

  return ok({
    years: Object.keys(years)
      .map(function(year) { return Number(year); })
      .sort(function(a, b) { return b - a; })
  });
}

function requireIdentity(idToken) {
  if (!idToken) throw new Error("missing idToken");
  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), {
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error("invalid google identity");
  const data = JSON.parse(response.getContentText());
  if (data.aud !== CONFIG_EXPECTED_CLIENT_ID()) throw new Error("unexpected client id");
  return {
    email: String(data.email || "").toLowerCase(),
    name: data.name || ""
  };
}

function CONFIG_EXPECTED_CLIENT_ID() {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty("GOOGLE_CLIENT_ID");
  if (!value) throw new Error("missing script property GOOGLE_CLIENT_ID");
  return value;
}

function ensureAllowed(email) {
  const normalized = String(email || "").toLowerCase();
  if (!normalized) throw new Error("missing email");
  if (isAdmin(normalized)) return true;

  const sheet = getAllowedUsersSheet();
  ensureAllowedUsersHeader(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error("email is not allowed");

  const header = mapHeader(values[0]);
  const allowed = values.slice(1).some(function(row) {
    const active = String(row[header.is_active] || "").toLowerCase();
    return String(row[header.email] || "").toLowerCase() === normalized && (active === "true" || active === "1" || active === "yes");
  });

  if (!allowed) throw new Error("email is not allowed");
  return true;
}

function isAdmin(email) {
  return CONFIG.ADMIN_EMAILS.map(function(item) {
    return String(item || "").toLowerCase();
  }).indexOf(String(email || "").toLowerCase()) !== -1;
}

function getUploadsSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.METADATA_SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_UPLOADS) || ss.insertSheet(CONFIG.SHEET_UPLOADS);
}

function getAllowedUsersSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.METADATA_SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_ALLOWED_USERS) || ss.insertSheet(CONFIG.SHEET_ALLOWED_USERS);
}

function ensureUploadsHeader(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    "upload_id",
    "activity_key",
    "category",
    "year_be",
    "month",
    "day",
    "activity_name",
    "folder_path",
    "folder_id",
    "folder_url",
    "uploaded_by",
    "uploaded_by_name",
    "file_count",
    "uploaded_at",
    "updated_at",
    "last_uploaded_by",
    "activity_status"
  ]);
  sheet.setFrozenRows(1);
}

function ensureAllowedUsersHeader(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(["email", "display_name", "is_active", "notes"]);
  sheet.appendRow([CONFIG.ADMIN_EMAILS[0], "Owner Admin", true, "system owner"]);
  if (CONFIG.ADMIN_EMAILS[1] && CONFIG.ADMIN_EMAILS[1] !== "YOUR_BACKUP_ADMIN_EMAIL_HERE") {
    sheet.appendRow([CONFIG.ADMIN_EMAILS[1], "Backup Admin", true, "backup admin"]);
  }
  sheet.setFrozenRows(1);
}

function mapHeader(headerRow) {
  const map = {};
  headerRow.forEach(function(name, index) {
    map[String(name)] = index;
  });
  return map;
}

function buildActivityKey(payload) {
  return [
    String(payload.category || "").trim(),
    String(payload.yearBE || "").trim(),
    pad2(payload.month),
    pad2(payload.day),
    sanitizeName(payload.activityName)
  ].join("|");
}

function validateRequired(payload, fields) {
  fields.forEach(function(field) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new Error("missing field: " + field);
    }
  });
}

function getOrCreateFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function sanitizeName(value) {
  return String(value || "").trim().replace(/[\/\\:*?"<>|]/g, "_").substring(0, 120);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function containsText(source, query) {
  return String(source || "").toLowerCase().indexOf(String(query || "").toLowerCase()) !== -1;
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok: true }, data)))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
