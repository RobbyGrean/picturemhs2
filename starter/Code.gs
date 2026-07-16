const CONFIG = {
  ROOT_FOLDER_ID: "REPLACE_WITH_DRIVE_ROOT_FOLDER_ID",
  METADATA_SHEET_ID: "REPLACE_WITH_METADATA_SPREADSHEET_ID",
  SHEET_UPLOADS: "uploads",
  SHEET_ALLOWED_USERS: "allowed_users",
  SHEET_ACTIVITY_AUDIT: "activity_audit",
  TIME_ZONE: "Asia/Bangkok",
  SEARCH_LIMIT: 50,
  PUBLIC_SEARCH_LIMIT: 50,
  PUBLIC_LATEST_LIMIT: 10,
  PUBLIC_YEAR_MIN: 2567,
  ACTIVITY_NAME_MAX_LENGTH: 120,
  PUBLIC_ACTIVITY_NAME_MAX_LENGTH: 100,
  MONTHS_TH: ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
  CATEGORIES: ["กิจกรรมและอื่นๆ", "ไปราชการ", "ประชุม"],
  ADMIN_EMAILS: ["owner@example.com", "backup-admin@example.com"]
};

const UPLOAD_HEADERS = [
  "upload_id", "activity_key", "category", "year_be", "month", "day",
  "activity_name", "folder_path", "folder_id", "folder_url", "uploaded_by",
  "uploaded_by_name", "file_count", "uploaded_at", "updated_at",
  "last_uploaded_by", "activity_status", "visibility", "cover_file_id"
];

const AUDIT_HEADERS = [
  "audit_id", "upload_id", "folder_id", "action", "actor_email",
  "occurred_at", "before_json", "after_json", "result", "error_message"
];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "health";

    if (action === "publicSearch" || action === "publicLatest") {
      try {
        return action === "publicSearch" ? handlePublicSearch(params) : handlePublicLatest();
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
    if (action === "getAllowedUsers") return handleGetAllowedUsers(identity);
    return fail("unknown action");
  } catch (error) {
    return fail(error.message);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const identity = requireIdentity(payload.idToken);
    const action = payload.action || "";

    if (action === "init") return handleInit(identity);
    if (action === "createFolder") return handleCreateFolder(identity, payload);
    if (action === "saveMetadata") return handleSaveMetadata(identity, payload);
    if (action === "appendMetadata") return handleAppendMetadata(identity, payload);
    if (action === "updateActivity") return handleUpdateActivity(identity, payload);
    if (action === "archiveActivity") return handleArchiveActivity(identity, payload);
    if (action === "restoreActivity") return handleRestoreActivity(identity, payload);
    if (action === "saveAllowedUser") return handleSaveAllowedUser(identity, payload);
    if (action === "setAllowedUserActive") return handleSetAllowedUserActive(identity, payload);
    return fail("unknown action");
  } catch (error) {
    return fail(error.message);
  }
}

function handleInit(identity) {
  ensureAllowed(identity.email);
  ensureAllowedUsersHeader(getAllowedUsersSheet());
  ensureUploadsHeader(getUploadsSheet());
  ensureAuditHeader(getActivityAuditSheet());
  return ok({
    userEmail: identity.email,
    userName: identity.name || "",
    role: isAdmin(identity.email) ? "admin" : "uploader",
    currentYearBE: getCurrentYearBE(),
    minEditableYearBE: getMinEditableYearBE()
  });
}

function handlePublicSearch(params) {
  const filters = validatePublicSearchParams(params);
  return publicActivitiesResponse(filters, CONFIG.PUBLIC_SEARCH_LIMIT);
}

function handlePublicLatest() {
  return publicActivitiesResponse(null, CONFIG.PUBLIC_LATEST_LIMIT);
}

function publicActivitiesResponse(filters, limit) {
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ results: [], truncated: false });
  const header = mapHeader(rows[0]);
  let results = rows.slice(1).map(function(row) {
    return activityFromRow(row, header);
  }).filter(function(item) {
    if (item.activityStatus !== "active" || normalizeVisibility(item.visibility) !== "public") return false;
    if (!filters) return true;
    if (String(item.yearBE) !== filters.yearBE) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.month && String(item.month) !== filters.month) return false;
    if (filters.day && String(item.day) !== filters.day) return false;
    if (filters.activityName && !containsText(item.activityName, filters.activityName)) return false;
    return true;
  });
  results.sort(compareActivityDescending);
  const truncated = results.length > limit;
  return ok({
    results: results.slice(0, limit).map(sanitizePublicActivity),
    truncated: truncated
  });
}

function sanitizePublicActivity(item) {
  return {
    activityKey: item.activityKey,
    category: item.category,
    yearBE: item.yearBE,
    month: item.month,
    day: item.day,
    activityName: item.activityName,
    folderUrl: item.folderUrl,
    fileCount: item.fileCount,
    updatedAt: item.updatedAt,
    coverUrl: buildDriveThumbnailUrl(item.coverFileId)
  };
}

function validatePublicSearchParams(params) {
  const yearBE = normalizeSearchText(params.yearBE, 4);
  const month = normalizeSearchText(params.month, 2);
  const day = normalizeSearchText(params.day, 2);
  const category = normalizeSearchText(params.category, 80);
  const activityName = normalizeSearchText(params.activityName, CONFIG.PUBLIC_ACTIVITY_NAME_MAX_LENGTH + 1);
  const currentYear = getCurrentYearBE();

  if (!yearBE) throw new Error("invalid public search: yearBE is required");
  if (!/^\d{4}$/.test(yearBE) || Number(yearBE) < CONFIG.PUBLIC_YEAR_MIN || Number(yearBE) > currentYear) {
    throw new Error("invalid public search: yearBE must be between " + CONFIG.PUBLIC_YEAR_MIN + " and " + currentYear);
  }
  validateOptionalMonthDay(month, day, "invalid public search: ");
  if (category && CONFIG.CATEGORIES.indexOf(category) === -1) throw new Error("invalid public search: unknown category");
  if (activityName.length > CONFIG.PUBLIC_ACTIVITY_NAME_MAX_LENGTH) throw new Error("invalid public search: activityName is too long");
  return {
    yearBE: yearBE,
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : "",
    category: category,
    activityName: activityName
  };
}

function handleCreateFolder(identity, payload) {
  ensureAllowed(identity.email);
  const input = validateActivityInput(payload);
  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const rows = sheet.getDataRange().getValues();
    const header = mapHeader(rows[0]);
    const key = buildActivityKey(input);
    if (findActiveByKey(rows, header, key)) throw new Error("activity already exists; use Search / Upload More");

    const destination = resolveDayFolder(input);
    if (folderNameExists(destination.dayFolder, input.activityName, "")) {
      throw new Error("activity folder already exists; use Search / Upload More or contact Admin");
    }
    const activityFolder = destination.dayFolder.createFolder(input.activityName);
    return ok({
      folderId: activityFolder.getId(),
      folderUrl: activityFolder.getUrl(),
      folderPath: buildFolderPath(input),
      activityName: input.activityName,
      activityKey: key
    });
  });
}

function handleSaveMetadata(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["folderId", "fileCount"]);
  const input = validateActivityInput(payload);
  const visibility = normalizeVisibility(payload.visibility || "public");
  const fileCount = positiveInteger(payload.fileCount, "fileCount");

  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const rows = sheet.getDataRange().getValues();
    const header = mapHeader(rows[0]);
    const key = buildActivityKey(input);
    if (findActiveByKey(rows, header, key)) throw new Error("activity already exists; use Search / Upload More");
    if (findByFolderId(rows, header, payload.folderId)) throw new Error("folder already has metadata");

    const folder = DriveApp.getFolderById(String(payload.folderId));
    if (folder.getName() !== input.activityName) throw new Error("folder name does not match activity");
    const expectedParent = resolveDayFolder(input).dayFolder;
    if (!folderHasParent(folder, expectedParent.getId())) throw new Error("folder is outside the expected activity hierarchy");
    const coverFileId = validateCoverFile(payload.coverFileId, folder.getId());
    const now = new Date().toISOString();
    const uploadId = Utilities.getUuid();
    sheet.appendRow([
      uploadId, key, input.category, input.yearBE, input.month, input.day,
      input.activityName, buildFolderPath(input), folder.getId(), folder.getUrl(),
      identity.email, identity.name || "", fileCount, now, now, identity.email,
      "active", visibility, coverFileId
    ]);
    return ok({ saved: true, uploadId: uploadId });
  });
}

function handleAppendMetadata(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["folderId", "fileCountDelta"]);
  const delta = positiveInteger(payload.fileCountDelta, "fileCountDelta");
  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const record = loadActivityRecord(sheet, "", payload.folderId);
    if (record.activity.activityStatus !== "active") throw new Error("activity is archived");
    enforceEditableYear(record.activity.yearBE);
    const uploadedCoverFileId = validateCoverFile(payload.coverFileId, record.activity.folderId);
    const coverFileId = uploadedCoverFileId || record.activity.coverFileId;
    const next = Object.assign({}, record.activity, {
      fileCount: Number(record.activity.fileCount || 0) + delta,
      updatedAt: new Date().toISOString(),
      lastUploadedBy: identity.email,
      coverFileId: coverFileId
    });
    writeActivityRow(sheet, record.rowIndex, record.header, record.row, next);
    return ok({ updated: true });
  });
}

function handleUpdateActivity(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["uploadId", "folderId"]);
  const input = validateActivityInput(payload);
  const requestedVisibility = normalizeVisibility(payload.visibility || "public");

  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const record = loadActivityRecord(sheet, payload.uploadId, payload.folderId);
    assertCanManage(identity, record.activity, false);
    const rows = sheet.getDataRange().getValues();
    const destination = resolveDayFolder(input);
    const folder = DriveApp.getFolderById(String(record.activity.folderId));
    const oldParents = folder.getParents();
    if (!oldParents.hasNext()) throw new Error("activity folder has no parent");
    const oldParent = oldParents.next();
    const oldName = folder.getName();
    const before = activitySnapshot(record.activity);
    const finalName = chooseUniqueActivityName(
      destination.dayFolder, input, folder.getId(), rows, record.header, record.activity.uploadId
    );
    const finalInput = Object.assign({}, input, { activityName: finalName });
    const next = Object.assign({}, record.activity, {
      activityKey: buildActivityKey(finalInput),
      category: finalInput.category,
      yearBE: finalInput.yearBE,
      month: finalInput.month,
      day: finalInput.day,
      activityName: finalInput.activityName,
      folderPath: buildFolderPath(finalInput),
      updatedAt: new Date().toISOString(),
      lastUploadedBy: identity.email,
      visibility: requestedVisibility
    });
    let driveChanged = false;
    try {
      if (oldParent.getId() !== destination.dayFolder.getId()) {
        folder.moveTo(destination.dayFolder);
        driveChanged = true;
      }
      if (oldName !== finalName) {
        folder.setName(finalName);
        driveChanged = true;
      }
      writeActivityRow(sheet, record.rowIndex, record.header, record.row, next);
    } catch (error) {
      let rollbackError = "";
      if (driveChanged) {
        try {
          folder.moveTo(oldParent);
          folder.setName(oldName);
        } catch (rollbackFailure) {
          rollbackError = "; rollback failed: " + rollbackFailure.message;
        }
      }
      safeRecordAudit(record.activity, identity.email, "failed_move", before, activitySnapshot(next), "failed", error.message + rollbackError);
      throw new Error("activity update failed; rollback attempted" + rollbackError);
    }

    const moved = oldParent.getId() !== destination.dayFolder.getId() || oldName !== finalName;
    const visibilityChanged = normalizeVisibility(record.activity.visibility) !== requestedVisibility;
    const action = moved ? "move" : (visibilityChanged ? "visibility_change" : "edit");
    recordAudit(record.activity, identity.email, action, before, activitySnapshot(next), "success", "");
    return ok({
      updated: true,
      activity: activityForAuthenticatedSearch(next, identity),
      collisionRenamed: finalName !== input.activityName
    });
  });
}

function handleArchiveActivity(identity, payload) {
  ensureAllowed(identity.email);
  validateRequired(payload, ["uploadId", "folderId"]);
  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const record = loadActivityRecord(sheet, payload.uploadId, payload.folderId);
    assertCanManage(identity, record.activity, false);
    const before = activitySnapshot(record.activity);
    const next = Object.assign({}, record.activity, {
      activityStatus: "archived",
      updatedAt: new Date().toISOString(),
      lastUploadedBy: identity.email
    });
    writeActivityRow(sheet, record.rowIndex, record.header, record.row, next);
    recordAudit(record.activity, identity.email, "archive", before, activitySnapshot(next), "success", "");
    return ok({ archived: true });
  });
}

function handleRestoreActivity(identity, payload) {
  ensureAllowed(identity.email);
  ensureAdmin(identity.email);
  validateRequired(payload, ["uploadId", "folderId"]);
  return withScriptLock(function() {
    const sheet = getUploadsSheet();
    ensureUploadsHeader(sheet);
    const record = loadActivityRecord(sheet, payload.uploadId, payload.folderId);
    if (record.activity.activityStatus !== "archived") throw new Error("activity is not archived");
    enforceEditableYear(record.activity.yearBE);
    const rows = sheet.getDataRange().getValues();
    const duplicate = findActiveByKey(rows, record.header, record.activity.activityKey, record.activity.uploadId);
    if (duplicate) throw new Error("active activity with the same key already exists");
    const before = activitySnapshot(record.activity);
    const next = Object.assign({}, record.activity, {
      activityStatus: "active",
      updatedAt: new Date().toISOString(),
      lastUploadedBy: identity.email
    });
    writeActivityRow(sheet, record.rowIndex, record.header, record.row, next);
    recordAudit(record.activity, identity.email, "restore", before, activitySnapshot(next), "success", "");
    return ok({ restored: true });
  });
}

function handleSearch(identity, params) {
  ensureAllowed(identity.email);
  const yearBE = String(params.yearBE || "").trim();
  if (!/^\d{4}$/.test(yearBE) || Number(yearBE) > getCurrentYearBE()) throw new Error("yearBE is required and cannot be in the future");
  validateOptionalMonthDay(String(params.month || ""), String(params.day || ""), "");
  const includeArchived = String(params.includeArchived || "").toLowerCase() === "true";
  if (includeArchived) ensureAdmin(identity.email);
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ results: [], truncated: false });
  const header = mapHeader(rows[0]);
  let results = rows.slice(1).map(function(row) {
    return activityFromRow(row, header);
  }).filter(function(item) {
    if (includeArchived ? item.activityStatus !== "archived" : item.activityStatus !== "active") return false;
    if (String(item.yearBE) !== yearBE) return false;
    if (params.category && item.category !== params.category) return false;
    if (params.month && String(item.month) !== String(Number(params.month))) return false;
    if (params.day && String(item.day) !== String(Number(params.day))) return false;
    if (params.activityName && !containsText(item.activityName, params.activityName)) return false;
    if (params.uploadedByName && !containsText(item.uploadedByName, params.uploadedByName)) return false;
    return true;
  });
  results.sort(compareActivityDescending);
  const truncated = results.length > CONFIG.SEARCH_LIMIT;
  return ok({
    results: results.slice(0, CONFIG.SEARCH_LIMIT).map(function(item) {
      return activityForAuthenticatedSearch(item, identity);
    }),
    truncated: truncated
  });
}

function activityForAuthenticatedSearch(item, identity) {
  const inWindow = isEditableYear(item.yearBE);
  const active = item.activityStatus === "active";
  const ownerOrAdmin = normalizeEmail(item.uploadedBy) === normalizeEmail(identity.email) || isAdmin(identity.email);
  const result = Object.assign({}, item, {
    visibility: normalizeVisibility(item.visibility),
    isReadOnly: !inWindow,
    canAppend: active && inWindow,
    canManage: active && inWindow && ownerOrAdmin,
    canRestore: item.activityStatus === "archived" && inWindow && isAdmin(identity.email),
    coverUrl: buildDriveThumbnailUrl(item.coverFileId)
  });
  delete result.coverFileId;
  return result;
}

function handleGetYears(identity) {
  ensureAllowed(identity.email);
  const rows = getUploadsSheet().getDataRange().getValues();
  if (rows.length <= 1) return ok({ years: [] });
  const header = mapHeader(rows[0]);
  const years = {};
  rows.slice(1).forEach(function(row) {
    const value = Number(row[header.year_be]);
    if (value) years[value] = true;
  });
  return ok({ years: Object.keys(years).map(Number).sort(function(a, b) { return b - a; }) });
}

function handleGetAllowedUsers(identity) {
  ensureAdmin(identity.email);
  const sheet = getAllowedUsersSheet();
  ensureAllowedUsersHeader(sheet);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return ok({ users: [] });
  const header = mapHeader(rows[0]);
  const users = rows.slice(1).filter(function(row) {
    return String(row[header.email] || "").trim();
  }).map(function(row) {
    const email = normalizeEmail(row[header.email]);
    return {
      email: email,
      displayName: String(row[header.display_name] || ""),
      isActive: isTruthy(row[header.is_active]),
      notes: String(row[header.notes] || ""),
      role: isAdmin(email) ? "admin" : "uploader"
    };
  }).sort(function(a, b) {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });
  return ok({ users: users });
}

function handleSaveAllowedUser(identity, payload) {
  ensureAdmin(identity.email);
  const email = validateAllowedUserEmail(payload.email);
  const displayName = String(payload.displayName || "").trim().substring(0, 80);
  const notes = String(payload.notes || "").trim().substring(0, 200);
  if (!displayName) throw new Error("missing field: displayName");
  return withScriptLock(function() {
    const sheet = getAllowedUsersSheet();
    ensureAllowedUsersHeader(sheet);
    const rows = sheet.getDataRange().getValues();
    const header = mapHeader(rows[0]);
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (normalizeEmail(rows[i][header.email]) === email) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) {
      sheet.appendRow([email, displayName, true, notes]);
    } else {
      sheet.getRange(rowIndex, header.display_name + 1).setValue(displayName);
      sheet.getRange(rowIndex, header.notes + 1).setValue(notes);
    }
    return ok({ saved: true, role: isAdmin(email) ? "admin" : "uploader" });
  });
}

function handleSetAllowedUserActive(identity, payload) {
  ensureAdmin(identity.email);
  const email = validateAllowedUserEmail(payload.email);
  const isActive = payload.isActive === true || String(payload.isActive).toLowerCase() === "true";
  if (isAdmin(email) && !isActive) throw new Error("admin cannot be deactivated");
  return withScriptLock(function() {
    const sheet = getAllowedUsersSheet();
    ensureAllowedUsersHeader(sheet);
    const rows = sheet.getDataRange().getValues();
    const header = mapHeader(rows[0]);
    for (let i = 1; i < rows.length; i++) {
      if (normalizeEmail(rows[i][header.email]) === email) {
        sheet.getRange(i + 1, header.is_active + 1).setValue(isActive);
        return ok({ updated: true, isActive: isActive });
      }
    }
    throw new Error("allowed user not found");
  });
}

function assertCanManage(identity, activity, allowArchived) {
  if (allowArchived ? ["active", "archived"].indexOf(activity.activityStatus) === -1 : activity.activityStatus !== "active") {
    throw new Error("activity is not active");
  }
  enforceEditableYear(activity.yearBE);
  if (!isAdmin(identity.email) && normalizeEmail(activity.uploadedBy) !== normalizeEmail(identity.email)) {
    throw new Error("activity owner or admin required");
  }
}

function loadActivityRecord(sheet, uploadId, folderId) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) throw new Error("uploads sheet is empty");
  const header = mapHeader(rows[0]);
  for (let i = 1; i < rows.length; i++) {
    const uploadMatches = !uploadId || String(rows[i][header.upload_id]) === String(uploadId);
    const folderMatches = !folderId || String(rows[i][header.folder_id]) === String(folderId);
    if (uploadMatches && folderMatches) {
      return { rowIndex: i + 1, row: rows[i].slice(), header: header, activity: activityFromRow(rows[i], header) };
    }
  }
  throw new Error("target activity not found or folder mismatch");
}

function activityFromRow(row, header) {
  return {
    uploadId: valueAt(row, header, "upload_id"),
    activityKey: valueAt(row, header, "activity_key"),
    category: valueAt(row, header, "category"),
    yearBE: Number(valueAt(row, header, "year_be")),
    month: Number(valueAt(row, header, "month")),
    day: Number(valueAt(row, header, "day")),
    activityName: valueAt(row, header, "activity_name"),
    folderPath: valueAt(row, header, "folder_path"),
    folderId: valueAt(row, header, "folder_id"),
    folderUrl: valueAt(row, header, "folder_url"),
    uploadedBy: valueAt(row, header, "uploaded_by"),
    uploadedByName: valueAt(row, header, "uploaded_by_name"),
    fileCount: Number(valueAt(row, header, "file_count") || 0),
    uploadedAt: valueAt(row, header, "uploaded_at"),
    updatedAt: valueAt(row, header, "updated_at"),
    lastUploadedBy: valueAt(row, header, "last_uploaded_by"),
    activityStatus: String(valueAt(row, header, "activity_status") || "active").toLowerCase(),
    visibility: readVisibility(valueAt(row, header, "visibility")),
    coverFileId: String(valueAt(row, header, "cover_file_id") || "").trim()
  };
}

function writeActivityRow(sheet, rowIndex, header, oldRow, activity) {
  const row = oldRow.slice();
  const values = {
    upload_id: activity.uploadId,
    activity_key: activity.activityKey,
    category: activity.category,
    year_be: activity.yearBE,
    month: activity.month,
    day: activity.day,
    activity_name: activity.activityName,
    folder_path: activity.folderPath,
    folder_id: activity.folderId,
    folder_url: activity.folderUrl,
    uploaded_by: activity.uploadedBy,
    uploaded_by_name: activity.uploadedByName,
    file_count: activity.fileCount,
    uploaded_at: activity.uploadedAt,
    updated_at: activity.updatedAt,
    last_uploaded_by: activity.lastUploadedBy,
    activity_status: activity.activityStatus,
    visibility: normalizeVisibility(activity.visibility),
    cover_file_id: activity.coverFileId || ""
  };
  UPLOAD_HEADERS.forEach(function(name) { row[header[name]] = values[name]; });
  sheet.getRange(rowIndex, 1, 1, UPLOAD_HEADERS.length).setValues([row.slice(0, UPLOAD_HEADERS.length)]);
}

function chooseUniqueActivityName(dayFolder, input, currentFolderId, rows, header, currentUploadId) {
  const base = sanitizeName(input.activityName);
  let candidate = base;
  let suffix = 0;
  while (folderNameExists(dayFolder, candidate, currentFolderId) ||
      findActiveByKey(rows, header, buildActivityKey(Object.assign({}, input, { activityName: candidate })), currentUploadId)) {
    suffix += 1;
    candidate = truncateForSuffix(base, " (" + suffix + ")");
  }
  return candidate;
}

function folderNameExists(parent, name, ignoredFolderId) {
  const iterator = parent.getFoldersByName(name);
  while (iterator.hasNext()) {
    if (String(iterator.next().getId()) !== String(ignoredFolderId || "")) return true;
  }
  return false;
}

function folderHasParent(folder, parentId) {
  const parents = folder.getParents();
  while (parents.hasNext()) {
    if (String(parents.next().getId()) === String(parentId)) return true;
  }
  return false;
}

function truncateForSuffix(base, suffix) {
  return base.substring(0, CONFIG.ACTIVITY_NAME_MAX_LENGTH - suffix.length).trim() + suffix;
}

function findActiveByKey(rows, header, key, ignoredUploadId) {
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][header.activity_key]) === String(key) &&
        String(rows[i][header.activity_status] || "active").toLowerCase() === "active" &&
        String(rows[i][header.upload_id]) !== String(ignoredUploadId || "")) return rows[i];
  }
  return null;
}

function findByFolderId(rows, header, folderId) {
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][header.folder_id]) === String(folderId)) return rows[i];
  }
  return null;
}

function resolveDayFolder(input) {
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const categoryFolder = getOrCreateFolder(root, input.category);
  const yearFolder = getOrCreateFolder(categoryFolder, String(input.yearBE));
  const monthFolder = getOrCreateFolder(yearFolder, pad2(input.month) + "_" + CONFIG.MONTHS_TH[input.month]);
  return { dayFolder: getOrCreateFolder(monthFolder, pad2(input.day)) };
}

function validateActivityInput(payload) {
  validateRequired(payload, ["category", "yearBE", "month", "day", "activityName"]);
  const category = String(payload.category).trim();
  if (CONFIG.CATEGORIES.indexOf(category) === -1) throw new Error("invalid category");
  const yearBE = Number(payload.yearBE);
  const month = Number(payload.month);
  const day = Number(payload.day);
  enforceEditableYear(yearBE);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("invalid month");
  const maxDay = new Date(yearBE - 543, month, 0).getDate();
  if (!Number.isInteger(day) || day < 1 || day > maxDay) throw new Error("invalid day");
  const activityName = sanitizeName(payload.activityName);
  if (!activityName) throw new Error("invalid activityName");
  return { category: category, yearBE: yearBE, month: month, day: day, activityName: activityName };
}

function buildActivityKey(payload) {
  return [
    String(payload.category || "").trim().toLowerCase(),
    String(payload.yearBE || "").trim(),
    pad2(payload.month),
    pad2(payload.day),
    sanitizeName(payload.activityName).toLowerCase().replace(/\s+/g, " ")
  ].join("|");
}

function buildFolderPath(input) {
  return [input.category, input.yearBE, pad2(input.month) + "_" + CONFIG.MONTHS_TH[input.month], pad2(input.day), input.activityName].join("/");
}

function getCurrentYearBE() {
  return Number(Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, "yyyy")) + 543;
}

function getMinEditableYearBE() {
  return getCurrentYearBE() - 2;
}

function isEditableYear(yearBE) {
  const year = Number(yearBE);
  return Number.isInteger(year) && year >= getMinEditableYearBE() && year <= getCurrentYearBE();
}

function enforceEditableYear(yearBE) {
  if (!isEditableYear(yearBE)) {
    throw new Error("activity year is read-only; allowed years are " + getMinEditableYearBE() + "-" + getCurrentYearBE());
  }
}

function normalizeVisibility(value) {
  const normalized = String(value || "public").trim().toLowerCase();
  if (["public", "internal"].indexOf(normalized) === -1) throw new Error("invalid visibility");
  return normalized;
}

function readVisibility(value) {
  const normalized = String(value || "public").trim().toLowerCase();
  return normalized === "public" || normalized === "internal" ? normalized : "internal";
}

function recordAudit(activity, actorEmail, action, before, after, result, errorMessage) {
  const sheet = getActivityAuditSheet();
  ensureAuditHeader(sheet);
  sheet.appendRow([
    Utilities.getUuid(), activity.uploadId, activity.folderId, action, normalizeEmail(actorEmail),
    new Date().toISOString(), JSON.stringify(before || {}), JSON.stringify(after || {}),
    result, String(errorMessage || "").substring(0, 1000)
  ]);
}

function safeRecordAudit(activity, actorEmail, action, before, after, result, errorMessage) {
  try { recordAudit(activity, actorEmail, action, before, after, result, errorMessage); } catch (_) {}
}

function activitySnapshot(activity) {
  return {
    activityKey: activity.activityKey, category: activity.category, yearBE: activity.yearBE,
    month: activity.month, day: activity.day, activityName: activity.activityName,
    folderPath: activity.folderPath, folderId: activity.folderId, folderUrl: activity.folderUrl,
    uploadedBy: activity.uploadedBy, fileCount: activity.fileCount,
    activityStatus: activity.activityStatus, visibility: normalizeVisibility(activity.visibility)
  };
}

function setupActivityManagement() {
  const uploads = getUploadsSheet();
  ensureUploadsHeader(uploads);
  const audit = getActivityAuditSheet();
  ensureAuditHeader(audit);
  return { uploadsRows: uploads.getLastRow(), auditSheet: CONFIG.SHEET_ACTIVITY_AUDIT };
}

function backfillActivityCovers(limit) {
  const maxRows = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const sheet = getUploadsSheet();
  ensureUploadsHeader(sheet);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    const emptyResult = { updated: 0, withoutCover: 0, checked: 0, pending: 0, errors: [] };
    console.log("backfillActivityCovers " + JSON.stringify(emptyResult));
    return emptyResult;
  }
  const header = mapHeader(rows[0]);
  const coverColumn = header.cover_file_id;
  const values = rows.slice(1).map(function(row) { return [String(row[coverColumn] || "").trim()]; });
  let checked = 0;
  let updated = 0;
  let withoutCover = 0;
  let changed = false;
  const errors = [];

  for (let index = 1; index < rows.length && checked < maxRows; index++) {
    if (values[index - 1][0]) continue;
    const activity = activityFromRow(rows[index], header);
    if (!activity.folderId) continue;
    checked += 1;
    try {
      const cover = findFolderCoverFile(DriveApp.getFolderById(activity.folderId));
      if (cover) {
        values[index - 1][0] = cover.getId();
        updated += 1;
      } else {
        values[index - 1][0] = "none";
        withoutCover += 1;
      }
      changed = true;
    } catch (error) {
      errors.push({ uploadId: activity.uploadId, error: String(error.message || error) });
    }
  }
  if (changed) sheet.getRange(2, coverColumn + 1, values.length, 1).setValues(values);
  const pending = values.filter(function(row) { return !row[0]; }).length;
  const result = { updated: updated, withoutCover: withoutCover, checked: checked, pending: pending, errors: errors };
  console.log("backfillActivityCovers " + JSON.stringify(result));
  return result;
}

function validateCoverFile(fileId, folderId) {
  const normalized = String(fileId || "").trim();
  if (!normalized) return "";
  const file = DriveApp.getFileById(normalized);
  const mimeType = String(file.getMimeType() || "").toLowerCase();
  if (mimeType.indexOf("image/") !== 0 && mimeType.indexOf("video/") !== 0) {
    throw new Error("cover file must be an image or video");
  }
  const parents = file.getParents();
  let belongsToFolder = false;
  while (parents.hasNext()) {
    if (String(parents.next().getId()) === String(folderId)) belongsToFolder = true;
  }
  if (!belongsToFolder) throw new Error("cover file is outside the activity folder");
  return normalized;
}

function findFolderCoverFile(folder) {
  const files = folder.getFiles();
  let firstVideo = null;
  while (files.hasNext()) {
    const file = files.next();
    const mimeType = String(file.getMimeType() || "").toLowerCase();
    if (mimeType.indexOf("image/") === 0) return file;
    if (!firstVideo && mimeType.indexOf("video/") === 0) firstVideo = file;
  }
  return firstVideo;
}

function buildDriveThumbnailUrl(fileId) {
  const normalized = String(fileId || "").trim();
  return normalized && normalized !== "none" ? "https://drive.google.com/thumbnail?id=" + encodeURIComponent(normalized) + "&sz=w640" : "";
}

function requireIdentity(idToken) {
  if (!idToken) throw new Error("missing idToken");
  const response = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error("invalid google identity");
  const data = JSON.parse(response.getContentText());
  if (data.aud !== CONFIG_EXPECTED_CLIENT_ID()) throw new Error("unexpected client id");
  return { email: normalizeEmail(data.email), name: data.name || "" };
}

function CONFIG_EXPECTED_CLIENT_ID() {
  const value = PropertiesService.getScriptProperties().getProperty("GOOGLE_CLIENT_ID");
  if (!value) throw new Error("missing script property GOOGLE_CLIENT_ID");
  return value;
}

function ensureAllowed(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("missing email");
  if (isAdmin(normalized)) return true;
  const sheet = getAllowedUsersSheet();
  ensureAllowedUsersHeader(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) throw new Error("email is not allowed");
  const header = mapHeader(values[0]);
  const allowed = values.slice(1).some(function(row) {
    return normalizeEmail(row[header.email]) === normalized && isTruthy(row[header.is_active]);
  });
  if (!allowed) throw new Error("email is not allowed");
  return true;
}

function ensureAdmin(email) {
  if (!isAdmin(email)) throw new Error("admin access required");
  return true;
}

function isAdmin(email) {
  return CONFIG.ADMIN_EMAILS.map(normalizeEmail).indexOf(normalizeEmail(email)) !== -1;
}

function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }

function validateAllowedUserEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid email");
  return email;
}

function isTruthy(value) {
  const normalized = String(value || "").toLowerCase();
  return value === true || normalized === "true" || normalized === "1" || normalized === "yes";
}

function withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function getUploadsSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.METADATA_SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_UPLOADS) || ss.insertSheet(CONFIG.SHEET_UPLOADS);
}

function getAllowedUsersSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.METADATA_SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_ALLOWED_USERS) || ss.insertSheet(CONFIG.SHEET_ALLOWED_USERS);
}

function getActivityAuditSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.METADATA_SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_ACTIVITY_AUDIT) || ss.insertSheet(CONFIG.SHEET_ACTIVITY_AUDIT);
}

function ensureUploadsHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(UPLOAD_HEADERS.slice());
    sheet.setFrozenRows(1);
    return;
  }
  const lastColumn = Math.max(sheet.getLastColumn ? sheet.getLastColumn() : 19, 19);
  const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const header = mapHeader(existing);
  UPLOAD_HEADERS.slice(0, 17).forEach(function(name) {
    if (header[name] === undefined) throw new Error("uploads header missing: " + name);
  });
  if (header.visibility === undefined) sheet.getRange(1, 18).setValue("visibility");
  if (header.cover_file_id === undefined) sheet.getRange(1, 19).setValue("cover_file_id");
  const rowCount = sheet.getLastRow() - 1;
  if (rowCount > 0) {
    const range = sheet.getRange(2, 18, rowCount, 1);
    const values = range.getValues();
    let changed = false;
    values.forEach(function(row) {
      if (!String(row[0] || "").trim()) { row[0] = "public"; changed = true; }
    });
    if (changed) range.setValues(values);
  }
}

function ensureAuditHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(AUDIT_HEADERS.slice());
    sheet.setFrozenRows(1);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).getValues()[0];
  AUDIT_HEADERS.forEach(function(name, index) {
    if (String(existing[index] || "") !== name) throw new Error("activity_audit header mismatch at column " + (index + 1));
  });
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
  headerRow.forEach(function(name, index) { map[String(name)] = index; });
  return map;
}

function valueAt(row, header, name) {
  return header[name] === undefined ? "" : row[header[name]];
}

function validateRequired(payload, fields) {
  fields.forEach(function(field) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") throw new Error("missing field: " + field);
  });
}

function validateOptionalMonthDay(month, day, prefix) {
  if (month && (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12)) throw new Error(prefix + "month must be between 1 and 12");
  if (day && (!/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31)) throw new Error(prefix + "day must be between 1 and 31");
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error("invalid " + field);
  return number;
}

function getOrCreateFolder(parent, name) {
  const iterator = parent.getFoldersByName(name);
  return iterator.hasNext() ? iterator.next() : parent.createFolder(name);
}

function sanitizeName(value) {
  return String(value || "").trim().replace(/[\/\\:*?"<>|]/g, "_").replace(/\s+/g, " ").substring(0, CONFIG.ACTIVITY_NAME_MAX_LENGTH).trim();
}

function normalizeSearchText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").substring(0, maxLength);
}

function pad2(value) { return String(value).padStart(2, "0"); }

function containsText(source, query) {
  return String(source || "").toLowerCase().indexOf(String(query || "").trim().toLowerCase()) !== -1;
}

function compareActivityDescending(a, b) {
  if (Number(a.yearBE) !== Number(b.yearBE)) return Number(b.yearBE) - Number(a.yearBE);
  if (Number(a.month) !== Number(b.month)) return Number(b.month) - Number(a.month);
  if (Number(a.day) !== Number(b.day)) return Number(b.day) - Number(a.day);
  const aTime = new Date(a.updatedAt).getTime();
  const bTime = new Date(b.updatedAt).getTime();
  if (!isNaN(aTime) && !isNaN(bTime)) return bTime - aTime;
  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok: true }, data))).setMimeType(ContentService.MimeType.JSON);
}

function fail(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
}
