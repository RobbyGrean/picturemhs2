const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzDyucuarduxEiLv-s4mpgoeJ6cKrx77nMPlc30-tb82z3DDsLPgVcqO1zSSwV5WXBZig/exec",
  GOOGLE_CLIENT_ID: "607972424710-gftopgttfukmekf0uvufalid628vs37a.apps.googleusercontent.com",
  CURRENT_YEAR_BE: Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())) + 543,
  CATEGORIES: ["กิจกรรมและอื่นๆ", "ไปราชการ", "ประชุม"],
  ACTIVITY_PRESETS: [
    "ประชุมผู้บริหาร",
    "ประชุมติดตามงาน",
    "ไปราชการ",
    "ต้อนรับคณะ",
    "อบรม",
    "กิจกรรมพิเศษ"
  ],
  MONTHS_TH: ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
};

const CATEGORY_COVER_FILES = new Map([
  [CONFIG.CATEGORIES[0], "activity.svg"],
  [CONFIG.CATEGORIES[1], "travel.svg"],
  [CONFIG.CATEGORIES[2], "meeting.svg"]
]);

const state = {
  currentUser: null,
  accessToken: null,
  idToken: null,
  googleAuthInitialized: false,
  newFiles: [],
  appendFiles: [],
  appendTarget: null,
  manageTarget: null,
  lastFocusedElement: null
};

document.addEventListener("DOMContentLoaded", () => {
  bootstrap();
});

function bootstrap() {
  seedStaticFields();
  bindTabs();
  bindDateControls();
  bindUploadControls();
  bindAppendControls();
  bindSearchControls();
  bindActivityManagement();
  bindAdminControls();
  bindSessionControls();
  restoreSession();
}

function seedStaticFields() {
  fillCategorySelect(document.getElementById("category"), false);
  fillCategorySelect(document.getElementById("searchCategory"), true);
  fillMonthSelect(document.getElementById("month"), false);
  fillMonthSelect(document.getElementById("searchMonth"), true);
  fillYearSelect(document.getElementById("yearBE"), false, getEditableYears());
  fillYearSelect(document.getElementById("searchYear"), true, []);
  fillDaySelect(document.getElementById("searchDay"), true, 31);

  const preset = document.getElementById("activityPreset");
  preset.innerHTML = '<option value="">พิมพ์ชื่อเอง</option>' +
    CONFIG.ACTIVITY_PRESETS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  preset.addEventListener("change", () => {
    if (preset.value) {
      document.getElementById("activityName").value = preset.value;
      validateNewUpload();
    }
  });

  document.getElementById("activityName").addEventListener("input", (event) => {
    if (event.target.value !== preset.value) preset.value = "";
  });
}

function bindTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-btn").forEach((b) => b.setAttribute("aria-selected", "false"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const target = btn.dataset.tab;
      document.getElementById("tab-upload").classList.toggle("hidden", target !== "upload");
      document.getElementById("tab-search").classList.toggle("hidden", target !== "search");
      document.getElementById("tab-users").classList.toggle("hidden", target !== "users");
      if (target === "search") {
        loadSearchYears();
      }
      if (target === "users") loadAllowedUsers();
    });
  });
}

function bindDateControls() {
  document.getElementById("yearBE").addEventListener("change", syncUploadDays);
  document.getElementById("month").addEventListener("change", syncUploadDays);
  document.getElementById("searchMonth").addEventListener("change", syncSearchDays);
  document.getElementById("searchYear").addEventListener("change", syncSearchDays);
}

function bindUploadControls() {
  ["category", "yearBE", "month", "day", "activityName"].forEach((id) => {
    document.getElementById(id).addEventListener("input", validateNewUpload);
    document.getElementById(id).addEventListener("change", validateNewUpload);
  });

  document.getElementById("fileInput").addEventListener("change", (event) => {
    addFiles(event.target.files, "new");
    event.target.value = "";
  });

  document.getElementById("btnUploadNew").addEventListener("click", handleNewUpload);
  document.getElementById("btnClearNew").addEventListener("click", requestClearNewForm);
}

function bindAppendControls() {
  document.getElementById("appendFileInput").addEventListener("change", (event) => {
    addFiles(event.target.files, "append");
    event.target.value = "";
  });
  document.getElementById("btnAppendUpload").addEventListener("click", handleAppendUpload);
  document.getElementById("btnAppendClear").addEventListener("click", clearAppendState);
}

function bindSearchControls() {
  document.getElementById("btnSearch").addEventListener("click", handleSearch);
  ["searchActivity", "searchUploader"].forEach((id) => {
    document.getElementById(id).addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleSearch();
    });
  });
}

function bindAdminControls() {
  document.getElementById("btnSaveAllowedUser").addEventListener("click", saveAllowedUser);
  document.getElementById("btnClearAllowedUser").addEventListener("click", clearAllowedUserForm);
}

function bindSessionControls() {
  document.getElementById("btnLogout").addEventListener("click", logout);
}

function restoreSession() {
  const savedUser = sessionStorage.getItem("picmhs2_user");
  const savedToken = sessionStorage.getItem("picmhs2_token");
  const savedIdToken = sessionStorage.getItem("picmhs2_id_token");
  if (savedUser && savedToken && savedIdToken) {
    state.currentUser = JSON.parse(savedUser);
    state.accessToken = savedToken;
    state.idToken = savedIdToken;
    showAppShell();
    return;
  }
  initGoogleAuth();
}

function initGoogleAuth() {
  if (!window.google || !window.google.accounts) {
    setTimeout(initGoogleAuth, 400);
    return;
  }

  if (state.googleAuthInitialized) return;

  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleCredential
  });

  google.accounts.id.renderButton(document.getElementById("googleSignInButton"), {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    locale: "th"
  });
  state.googleAuthInitialized = true;
}

async function handleCredential(response) {
  showStatus("loginStatus", "info", "กำลังตรวจสอบสิทธิ์ Google และ Drive...");
  state.idToken = response.credential;
  const profile = parseJwt(response.credential);
  state.currentUser = {
    email: profile.email,
    name: profile.name,
    picture: profile.picture || ""
  };

  try {
    const initResult = await apiPost({
      action: "init",
      userEmail: state.currentUser.email,
      userName: state.currentUser.name,
      idToken: response.credential
    });
    state.currentUser.role = initResult.role || "uploader";
    CONFIG.CURRENT_YEAR_BE = Number(initResult.currentYearBE || CONFIG.CURRENT_YEAR_BE);
  } catch (error) {
    logout();
    showStatus("loginStatus", "error", error.message);
    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        logout();
        showStatus("loginStatus", "error", "ขอสิทธิ์ Google Drive ไม่สำเร็จ");
        return;
      }

      state.accessToken = tokenResponse.access_token;
      sessionStorage.setItem("picmhs2_user", JSON.stringify(state.currentUser));
      sessionStorage.setItem("picmhs2_token", state.accessToken);
      sessionStorage.setItem("picmhs2_id_token", state.idToken);
      showAppShell();
    }
  });

  tokenClient.requestAccessToken({ prompt: "consent" });
}

function showAppShell() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  document.getElementById("userText").textContent = `${state.currentUser.name} (${state.currentUser.email})`;
  document.getElementById("adminTabButton").classList.toggle("hidden", state.currentUser.role !== "admin");
  document.getElementById("archivedFilterWrap").classList.toggle("hidden", state.currentUser.role !== "admin");
  clearStatus("uploadStatus");
  clearStatus("searchStatus");
  clearStatus("appendStatus");
}

function logout() {
  sessionStorage.clear();
  state.currentUser = null;
  state.accessToken = null;
  state.idToken = null;
  state.newFiles = [];
  state.appendFiles = [];
  state.appendTarget = null;
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
  google?.accounts?.id?.disableAutoSelect?.();
}

function syncUploadDays() {
  const year = Number(document.getElementById("yearBE").value || 0);
  const month = Number(document.getElementById("month").value || 0);
  if (!year || !month) {
    fillDaySelect(document.getElementById("day"), false, 0);
    return;
  }
  const total = new Date(year - 543, month, 0).getDate();
  fillDaySelect(document.getElementById("day"), false, total);
}

function syncSearchDays() {
  const year = Number(document.getElementById("searchYear").value || CONFIG.CURRENT_YEAR_BE);
  const month = Number(document.getElementById("searchMonth").value || 0);
  fillDaySelect(document.getElementById("searchDay"), true, month ? new Date(year - 543, month, 0).getDate() : 31);
}

function syncManageDays() {
  const year = Number(document.getElementById("manageYear").value || CONFIG.CURRENT_YEAR_BE);
  const month = Number(document.getElementById("manageMonth").value || 0);
  const selected = document.getElementById("manageDay").value;
  fillDaySelect(document.getElementById("manageDay"), false, month ? new Date(year - 543, month, 0).getDate() : 0);
  document.getElementById("manageDay").value = selected;
}

function fillCategorySelect(el, includeAll) {
  const first = includeAll ? '<option value="">ทุกหมวด</option>' : '<option value="">เลือกหมวด</option>';
  el.innerHTML = first + CONFIG.CATEGORIES.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
}

function fillMonthSelect(el, includeAll) {
  const first = includeAll ? '<option value="">ทุกเดือน</option>' : '<option value="">เลือกเดือน</option>';
  el.innerHTML = first + CONFIG.MONTHS_TH
    .map((label, index) => index ? `<option value="${index}">${index} - ${escapeHtml(label)}</option>` : "")
    .join("");
}

function fillYearSelect(el, includeAll, years) {
  const first = includeAll ? '<option value="">เลือกปีที่ต้องการ</option>' : '<option value="">เลือกปี</option>';
  const source = Array.isArray(years) ? years : [];
  el.innerHTML = first + source.map((year) => `<option value="${year}" ${Number(year) === CONFIG.CURRENT_YEAR_BE && !includeAll ? "selected" : ""}>${year}</option>`).join("");
}

function getEditableYears() {
  return [CONFIG.CURRENT_YEAR_BE - 2, CONFIG.CURRENT_YEAR_BE - 1, CONFIG.CURRENT_YEAR_BE];
}

function fillDaySelect(el, includeAll, total) {
  const first = includeAll ? '<option value="">ทุกวัน</option>' : '<option value="">เลือกวัน</option>';
  let html = first;
  for (let day = 1; day <= total; day++) {
    html += `<option value="${day}">${day}</option>`;
  }
  el.innerHTML = html;
}

function addFiles(fileList, mode) {
  const target = mode === "append" ? state.appendFiles : state.newFiles;
  Array.from(fileList).forEach((file) => {
    const exists = target.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
    if (!exists) target.push(file);
  });
  renderFiles(mode);
  validateNewUpload();
  validateAppendUpload();
}

function renderFiles(mode) {
  const list = mode === "append" ? state.appendFiles : state.newFiles;
  const container = document.getElementById(mode === "append" ? "appendFileList" : "fileList");
  container.innerHTML = list.map((file, index) => `
    <div class="file-item">
      <div>${escapeHtml(file.name)}</div>
      <div class="micro">${formatBytes(file.size)}</div>
      <button class="btn btn-secondary" type="button" onclick="removeFile('${mode}', ${index})">ลบ</button>
    </div>
  `).join("");
}

function removeFile(mode, index) {
  if (mode === "append") {
    state.appendFiles.splice(index, 1);
  } else {
    state.newFiles.splice(index, 1);
  }
  renderFiles(mode);
  validateNewUpload();
  validateAppendUpload();
}

function validateNewUpload() {
  const ok = Boolean(
    document.getElementById("category").value &&
    document.getElementById("yearBE").value &&
    document.getElementById("month").value &&
    document.getElementById("day").value &&
    document.getElementById("activityName").value.trim() &&
    state.newFiles.length
  );
  document.getElementById("btnUploadNew").disabled = !ok;
}

function validateAppendUpload() {
  document.getElementById("btnAppendUpload").disabled = !(state.appendTarget && state.appendFiles.length);
}

async function handleNewUpload() {
  const payload = collectNewActivityForm();
  if (!payload) return;

  const uploadButton = document.getElementById("btnUploadNew");
  uploadButton.disabled = true;
  uploadButton.textContent = "กำลังอัปโหลด...";
  try {
    showOverlay("กำลังสร้างโฟลเดอร์กิจกรรม", 12);
    const folder = await apiPost({
      action: "createFolder",
      idToken: await getFreshIdToken(),
      userEmail: state.currentUser.email,
      category: payload.category,
      yearBE: payload.yearBE,
      month: payload.month,
      day: payload.day,
      activityName: payload.activityName
    });

    const uploadedFiles = await uploadBatch(state.newFiles, folder.folderId, "อัปโหลดกิจกรรมใหม่");
    const coverFile = chooseCoverFile(uploadedFiles);

    showOverlay("กำลังบันทึกข้อมูลกิจกรรม", 92);
    await apiPost({
      action: "saveMetadata",
      idToken: await getFreshIdToken(),
      userEmail: state.currentUser.email,
      userName: state.currentUser.name,
      category: payload.category,
      yearBE: payload.yearBE,
      month: payload.month,
      day: payload.day,
      activityName: folder.activityName,
      folderId: folder.folderId,
      folderUrl: folder.folderUrl,
      folderPath: folder.folderPath,
      visibility: payload.visibility,
      fileCount: state.newFiles.length,
      coverFileId: coverFile ? coverFile.id : "",
      uploadMode: "new"
    });

    hideOverlay();
    showStatus("uploadStatus", "success", `อัปโหลดสำเร็จ ${state.newFiles.length} ไฟล์`);
    clearNewForm();
  } catch (error) {
    hideOverlay();
    showStatus("uploadStatus", "error", error.message);
  } finally {
    uploadButton.textContent = "อัปโหลดกิจกรรมใหม่";
    validateNewUpload();
  }
}

async function handleAppendUpload() {
  if (!state.appendTarget) return;

  const appendButton = document.getElementById("btnAppendUpload");
  appendButton.disabled = true;
  appendButton.textContent = "กำลังอัปโหลด...";
  try {
    const uploadedFiles = await uploadBatch(state.appendFiles, state.appendTarget.folderId, "อัปโหลดเพิ่ม");
    const coverFile = chooseCoverFile(uploadedFiles);

    showOverlay("กำลังอัปเดตข้อมูลกิจกรรม", 94);
    await apiPost({
      action: "appendMetadata",
      idToken: await getFreshIdToken(),
      userEmail: state.currentUser.email,
      userName: state.currentUser.name,
      folderId: state.appendTarget.folderId,
      fileCountDelta: state.appendFiles.length,
      coverFileId: coverFile ? coverFile.id : ""
    });

    hideOverlay();
    showStatus("appendStatus", "success", `อัปโหลดเพิ่มสำเร็จ ${state.appendFiles.length} ไฟล์`);
    clearAppendState(false);
    handleSearch();
  } catch (error) {
    hideOverlay();
    showStatus("appendStatus", "error", error.message);
  } finally {
    appendButton.textContent = "อัปโหลดเพิ่ม";
    validateAppendUpload();
  }
}

async function uploadBatch(files, folderId, title) {
  let completed = 0;
  const uploadedFiles = [];
  for (const file of files) {
    const progress = Math.round((completed / files.length) * 72) + 18;
    showOverlay(`${title}: ${completed + 1}/${files.length} - ${file.name}`, progress);
    uploadedFiles.push(await uploadFileToDrive(file, folderId));
    completed += 1;
  }
  return uploadedFiles;
}

function chooseCoverFile(files) {
  return files.find((file) => String(file.mimeType || "").startsWith("image/")) ||
    files.find((file) => String(file.mimeType || "").startsWith("video/")) || null;
}

async function uploadFileToDrive(file, folderId) {
  const token = state.accessToken;
  const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2Cname%2CmimeType", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": file.type || "application/octet-stream",
      "X-Upload-Content-Length": String(file.size)
    },
    body: JSON.stringify({
      name: file.name,
      parents: [folderId]
    })
  });

  if (initRes.status === 401) {
    await refreshDriveToken();
    return uploadFileToDrive(file, folderId);
  }

  if (!initRes.ok) throw new Error(`เริ่มอัปโหลดไม่สำเร็จ (${initRes.status})`);
  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("Google Drive ไม่ส่งที่อยู่อัปโหลดกลับมา");

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (uploadRes.status === 401) {
    await refreshDriveToken();
    return uploadFileToDrive(file, folderId);
  }

  if (!uploadRes.ok) throw new Error(`อัปโหลดไฟล์ไม่สำเร็จ (${uploadRes.status})`);
  const uploaded = await uploadRes.json();
  if (!uploaded.id) throw new Error("Google Drive ไม่ส่ง file ID กลับมา");
  return { id: uploaded.id, name: uploaded.name || file.name, mimeType: uploaded.mimeType || file.type || "" };
}

async function refreshDriveToken() {
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        if (response.error) {
          reject(new Error("ต่ออายุสิทธิ์ Google Drive ไม่สำเร็จ"));
          return;
        }
        state.accessToken = response.access_token;
        sessionStorage.setItem("picmhs2_token", state.accessToken);
        resolve();
      }
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function handleSearch() {
  const searchButton = document.getElementById("btnSearch");
  const selectedYear = document.getElementById("searchYear").value;
  if (!selectedYear) {
    showStatus("searchStatus", "error", "เลือกปี พ.ศ. ก่อนค้นหา");
    document.getElementById("searchYear").focus();
    return;
  }
  try {
    searchButton.disabled = true;
    searchButton.textContent = "กำลังค้นหา...";
    showStatus("searchStatus", "info", "กำลังค้นหา...");
    renderSearchState("loading");
    const result = await apiGet({
      action: "search",
      idToken: await getFreshIdToken(),
      category: document.getElementById("searchCategory").value,
      yearBE: selectedYear,
      month: document.getElementById("searchMonth").value,
      day: document.getElementById("searchDay").value,
      activityName: document.getElementById("searchActivity").value.trim(),
      uploadedByName: document.getElementById("searchUploader").value.trim(),
      includeArchived: state.currentUser?.role === "admin" && document.getElementById("searchArchived").checked
    });

    const results = result.results || [];
    renderSearchResults(results);
    if (results.length) {
      showStatus("searchStatus", "success", `พบ ${results.length} รายการ${result.truncated ? " (แสดงสูงสุด 50 รายการ กรุณาเพิ่มตัวกรอง)" : ""}`);
    } else {
      clearStatus("searchStatus");
    }
  } catch (error) {
    renderSearchState("error");
    showStatus("searchStatus", "error", error.message);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "ค้นหา";
  }
}

function renderSearchResults(results) {
  const el = document.getElementById("searchResults");
  if (!results.length) {
    renderSearchState("no-result");
    return;
  }

  el.replaceChildren();
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    const cover = createActivityCover(item, "./assets/covers/");
    const body = document.createElement("div");
    body.className = "result-card-body";
    const head = document.createElement("div");
    head.className = "result-head";
    const content = document.createElement("div");
    const title = document.createElement("h4");
    title.className = "result-title";
    title.textContent = item.activityName || "กิจกรรมไม่มีชื่อ";
    const pills = document.createElement("div");
    pills.className = "pill-row";
    addResultPill(pills, item.category);
    addResultPill(pills, `${item.day} ${CONFIG.MONTHS_TH[Number(item.month)] || ""} ${item.yearBE}`);
    addResultPill(pills, `${item.fileCount} ไฟล์`);
    addResultPill(pills, `โดย ${item.uploadedByName || "-"}`);
    if (item.visibility === "internal") addResultPill(pills, "ไม่เผยแพร่", "internal");
    if (item.isReadOnly) addResultPill(pills, "ข้อมูลย้อนหลัง — อ่านอย่างเดียว", "readonly");
    if (item.activityStatus === "archived") addResultPill(pills, "ลบแล้ว", "archived");
    content.append(title, pills);
    head.appendChild(content);
    const path = document.createElement("div");
    path.className = "micro";
    path.textContent = item.folderPath || "";
    const actions = document.createElement("div");
    actions.className = "result-actions";
    const drive = document.createElement("a");
    drive.className = "btn btn-drive";
    drive.href = item.folderUrl;
    drive.target = "_blank";
    drive.rel = "noopener noreferrer";
    drive.textContent = "เปิด Drive";
    actions.appendChild(drive);
    if (item.canAppend) actions.appendChild(resultButton("อัปโหลดเพิ่ม", "btn-primary", () => selectAppendTarget(item)));
    if (item.canManage) actions.appendChild(resultButton("แก้ไข/ย้ายกิจกรรม", "btn-secondary", () => openManageActivity(item)));
    if (item.canManage) actions.appendChild(resultButton("ลบกิจกรรมนี้", "btn-secondary", () => archiveActivityItem(item, false)));
    if (item.canRestore) actions.appendChild(resultButton("กู้คืนกิจกรรม", "btn-primary", () => restoreActivity(item)));
    body.append(head, path, actions);
    card.append(cover, body);
    el.appendChild(card);
  });
}

function createActivityCover(item, basePath) {
  const cover = document.createElement("div");
  cover.className = "result-cover";
  const image = document.createElement("img");
  const fallback = `${basePath}${CATEGORY_COVER_FILES.get(item.category) || "activity.svg"}`;
  const hasPreview = isSafeDriveThumbnailUrl(item.coverUrl);
  image.src = hasPreview ? item.coverUrl : fallback;
  image.alt = hasPreview ? `ภาพตัวอย่าง ${item.activityName || "กิจกรรม"}` : `ภาพประกอบหมวด ${item.category || "กิจกรรม"}`;
  if (hasPreview) image.addEventListener("error", () => { image.src = fallback; }, { once: true });
  image.width = 320;
  image.height = 200;
  image.loading = "lazy";
  image.decoding = "async";
  cover.appendChild(image);
  return cover;
}

function isSafeDriveThumbnailUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && url.hostname === "drive.google.com" && url.pathname === "/thumbnail";
  } catch (error) {
    return false;
  }
}

function addResultPill(container, text, variant = "") {
  const pill = document.createElement("span");
  pill.className = `pill ${variant}`.trim();
  pill.textContent = text || "-";
  container.appendChild(pill);
}

function resultButton(text, variant, handler) {
  const button = document.createElement("button");
  button.className = `btn ${variant}`;
  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function renderSearchState(type) {
  const states = {
    loading: ["กำลังค้นหา", "ระบบกำลังตรวจสอบข้อมูลกิจกรรม กรุณารอสักครู่"],
    "no-result": ["ไม่พบกิจกรรม", "ลองลดตัวกรอง หรือค้นหาด้วยคำที่สั้นลง"],
    error: ["ค้นหาไม่สำเร็จ", "ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"]
  };
  const [title, message] = states[type] || ["เริ่มค้นหากิจกรรม", "เลือกตัวกรองเท่าที่ทราบ แล้วกดค้นหา"];
  const el = document.getElementById("searchResults");
  el.replaceChildren();
  const box = document.createElement("div");
  box.className = "empty-state";
  const strong = document.createElement("strong");
  strong.textContent = title;
  box.append(strong, document.createTextNode(message));
  el.appendChild(box);
}

function selectAppendTarget(item) {
  state.appendTarget = item;
  document.getElementById("appendTarget").value = `${state.appendTarget.activityName} | ${state.appendTarget.folderPath}`;
  document.getElementById("appendSelectedName").textContent = state.appendTarget.activityName || "กิจกรรมที่เลือก";
  document.getElementById("appendSelectedMeta").textContent = `${state.appendTarget.day} ${CONFIG.MONTHS_TH[Number(state.appendTarget.month)] || ""} ${state.appendTarget.yearBE} · ${state.appendTarget.category}`;
  document.getElementById("appendSelectedSummary").hidden = false;
  showStatus("appendStatus", "info", "เลือกกิจกรรมแล้ว สามารถเพิ่มไฟล์ได้");
  validateAppendUpload();
  document.querySelector('[data-tab="search"]').click();
}

function openManageActivity(item) {
  state.manageTarget = item;
  fillYearSelect(document.getElementById("manageYear"), false, getEditableYears());
  document.getElementById("manageCategory").value = item.category;
  document.getElementById("manageYear").value = String(item.yearBE);
  document.getElementById("manageMonth").value = String(item.month);
  syncManageDays();
  document.getElementById("manageDay").value = String(item.day);
  document.getElementById("manageName").value = item.activityName;
  document.getElementById("manageVisibility").value = item.visibility || "public";
  clearStatus("manageStatus");
  const overlay = document.getElementById("activityManageOverlay");
  state.lastFocusedElement = document.activeElement;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  overlay.querySelector(".overlay-card").focus();
}

function closeManageActivity() {
  const overlay = document.getElementById("activityManageOverlay");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  state.manageTarget = null;
  if (state.lastFocusedElement?.focus) state.lastFocusedElement.focus();
  state.lastFocusedElement = null;
}

async function saveManagedActivity() {
  if (!state.manageTarget) return;
  const payload = {
    action: "updateActivity",
    idToken: await getFreshIdToken(),
    uploadId: state.manageTarget.uploadId,
    folderId: state.manageTarget.folderId,
    category: document.getElementById("manageCategory").value,
    yearBE: Number(document.getElementById("manageYear").value),
    month: Number(document.getElementById("manageMonth").value),
    day: Number(document.getElementById("manageDay").value),
    activityName: document.getElementById("manageName").value.trim(),
    visibility: document.getElementById("manageVisibility").value
  };
  if (!payload.category || !payload.yearBE || !payload.month || !payload.day || !payload.activityName) {
    showStatus("manageStatus", "error", "กรอกข้อมูลกิจกรรมให้ครบ");
    return;
  }
  const button = document.getElementById("btnSaveActivity");
  button.disabled = true;
  try {
    const result = await apiPost(payload);
    closeManageActivity();
    await handleSearch();
    showStatus("searchStatus", "success", result.collisionRenamed ? "บันทึกแล้ว ระบบเติมเลขท้ายชื่อเพราะปลายทางมีชื่อซ้ำ" : "บันทึกการแก้ไขแล้ว");
  } catch (error) {
    showStatus("manageStatus", "error", error.message);
  } finally {
    button.disabled = false;
  }
}

async function archiveManagedActivity() {
  if (!state.manageTarget) return;
  await archiveActivityItem(state.manageTarget, true);
}

async function archiveActivityItem(item, closeOverlayAfter) {
  const confirmed = window.confirm("ลบกิจกรรมนี้ออกจากระบบค้นหา?\nกิจกรรมจะไม่แสดงในหน้าค้นหาหรือเว็บสาธารณะ แต่ไฟล์ยังเก็บอยู่ใน Google Drive และผู้ดูแลสามารถกู้คืนรายการได้");
  if (!confirmed) return;
  const button = document.getElementById("btnArchiveActivity");
  if (closeOverlayAfter) button.disabled = true;
  try {
    await apiPost({
      action: "archiveActivity",
      idToken: await getFreshIdToken(),
      uploadId: item.uploadId,
      folderId: item.folderId
    });
    if (closeOverlayAfter) closeManageActivity();
    clearAppendState();
    await handleSearch();
    showStatus("searchStatus", "success", "ลบกิจกรรมออกจากผลค้นหาแล้ว ไฟล์ใน Drive ไม่ถูกลบ");
  } catch (error) {
    showStatus(closeOverlayAfter ? "manageStatus" : "searchStatus", "error", error.message);
  } finally {
    if (closeOverlayAfter) button.disabled = false;
  }
}

async function restoreActivity(item) {
  if (!window.confirm(`กู้คืนกิจกรรม “${item.activityName}” ใช่หรือไม่`)) return;
  try {
    await apiPost({
      action: "restoreActivity",
      idToken: await getFreshIdToken(),
      uploadId: item.uploadId,
      folderId: item.folderId
    });
    await handleSearch();
    showStatus("searchStatus", "success", "กู้คืนกิจกรรมแล้ว");
  } catch (error) {
    showStatus("searchStatus", "error", error.message);
  }
}

async function loadSearchYears() {
  try {
    const result = await apiGet({
      action: "getYears",
      idToken: await getFreshIdToken()
    });
    const select = document.getElementById("searchYear");
    const selected = select.value;
    fillYearSelect(select, true, result.years || []);
    if ((result.years || []).map(String).includes(selected)) select.value = selected;
  } catch (_) {
  }
}

async function loadAllowedUsers(showLoading = true) {
  if (state.currentUser?.role !== "admin") return;
  try {
    if (showLoading) showStatus("userAdminStatus", "info", "กำลังโหลดรายชื่อผู้ใช้งาน...");
    const result = await apiGet({
      action: "getAllowedUsers",
      idToken: await getFreshIdToken()
    });
    renderAllowedUsers(result.users || []);
    if (showLoading) clearStatus("userAdminStatus");
  } catch (error) {
    showStatus("userAdminStatus", "error", error.message);
  }
}

function renderAllowedUsers(users) {
  const container = document.getElementById("allowedUsersList");
  container.replaceChildren();

  if (!users.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "ยังไม่มีรายชื่อผู้ได้รับอนุญาต";
    container.appendChild(empty);
    return;
  }

  const groups = [
    { title: "ผู้ดูแลระบบ", users: users.filter((user) => user.role === "admin") },
    { title: "ผู้อัปโหลดที่ใช้งานอยู่", users: users.filter((user) => user.role !== "admin" && user.isActive) },
    { title: "ผู้ใช้ที่ปิดสิทธิ์", users: users.filter((user) => user.role !== "admin" && !user.isActive) }
  ];

  groups.filter((group) => group.users.length).forEach((group) => {
    const section = document.createElement("section");
    section.className = "user-group";
    const heading = document.createElement("h4");
    heading.className = "user-group-title";
    heading.textContent = group.title;
    const count = document.createElement("span");
    count.className = "user-group-count";
    count.textContent = `${group.users.length} คน`;
    heading.appendChild(count);
    section.appendChild(heading);

    group.users.forEach((user) => {
    const card = document.createElement("article");
    card.className = "user-card";

    const main = document.createElement("div");
    main.className = "user-card-main";
    const name = document.createElement("strong");
    name.textContent = user.displayName || user.email;
    const email = document.createElement("span");
    email.textContent = user.email;
    main.append(name, email);
    if (user.notes) {
      const notes = document.createElement("span");
      notes.textContent = user.notes;
      main.appendChild(notes);
    }

    const actions = document.createElement("div");
    actions.className = "user-card-actions";
    const role = document.createElement("span");
    role.className = `user-role${user.isActive ? "" : " inactive"}`;
    role.textContent = user.role === "admin" ? "ผู้ดูแลระบบ" : (user.isActive ? "ผู้อัปโหลด" : "ปิดสิทธิ์");

    const editButton = document.createElement("button");
    editButton.className = "btn btn-secondary";
    editButton.type = "button";
    editButton.textContent = "แก้ไข";
    editButton.addEventListener("click", () => editAllowedUser(user));

    const toggleButton = document.createElement("button");
    toggleButton.className = "btn btn-secondary";
    toggleButton.type = "button";
    toggleButton.textContent = user.isActive ? "ปิดสิทธิ์" : "เปิดสิทธิ์";
    toggleButton.disabled = user.role === "admin";
    toggleButton.addEventListener("click", () => setAllowedUserActive(user));

    actions.append(role, editButton, toggleButton);
    card.append(main, actions);
    section.appendChild(card);
    });
    container.appendChild(section);
  });
}

function bindActivityManagement() {
  fillCategorySelect(document.getElementById("manageCategory"), false);
  fillMonthSelect(document.getElementById("manageMonth"), false);
  fillYearSelect(document.getElementById("manageYear"), false, getEditableYears());
  document.getElementById("manageYear").addEventListener("change", syncManageDays);
  document.getElementById("manageMonth").addEventListener("change", syncManageDays);
  document.getElementById("btnSaveActivity").addEventListener("click", saveManagedActivity);
  document.getElementById("btnArchiveActivity").addEventListener("click", archiveManagedActivity);
  document.getElementById("btnCancelManage").addEventListener("click", closeManageActivity);
  document.getElementById("btnCloseManage").addEventListener("click", closeManageActivity);
  document.addEventListener("keydown", (event) => {
    const overlay = document.getElementById("activityManageOverlay");
    if (event.key === "Escape" && overlay.classList.contains("show")) closeManageActivity();
  });
}

function editAllowedUser(user) {
  document.getElementById("allowedUserEmail").value = user.email;
  document.getElementById("allowedUserName").value = user.displayName || "";
  document.getElementById("allowedUserNotes").value = user.notes || "";
  document.getElementById("allowedUserEmail").focus();
}

async function saveAllowedUser() {
  const email = document.getElementById("allowedUserEmail").value.trim();
  const displayName = document.getElementById("allowedUserName").value.trim();
  const notes = document.getElementById("allowedUserNotes").value.trim();
  if (!email || !displayName) {
    showStatus("userAdminStatus", "error", "กรอกอีเมลและชื่อที่แสดงให้ครบ");
    return;
  }

  const button = document.getElementById("btnSaveAllowedUser");
  button.disabled = true;
  try {
    await apiPost({
      action: "saveAllowedUser",
      idToken: await getFreshIdToken(),
      email: email,
      displayName: displayName,
      notes: notes
    });
    clearAllowedUserForm();
    await loadAllowedUsers(false);
    showStatus("userAdminStatus", "success", "บันทึกผู้อัปโหลดแล้ว");
  } catch (error) {
    showStatus("userAdminStatus", "error", error.message);
  } finally {
    button.disabled = false;
  }
}

async function setAllowedUserActive(user) {
  const nextActive = !user.isActive;
  if (!nextActive && !window.confirm(`ปิดสิทธิ์ ${user.email} ใช่หรือไม่`)) return;

  try {
    await apiPost({
      action: "setAllowedUserActive",
      idToken: await getFreshIdToken(),
      email: user.email,
      isActive: nextActive
    });
    await loadAllowedUsers(false);
    showStatus("userAdminStatus", "success", nextActive ? "เปิดสิทธิ์ผู้อัปโหลดแล้ว" : "ปิดสิทธิ์ผู้อัปโหลดแล้ว");
  } catch (error) {
    showStatus("userAdminStatus", "error", error.message);
  }
}

function clearAllowedUserForm() {
  document.getElementById("allowedUserEmail").value = "";
  document.getElementById("allowedUserName").value = "";
  document.getElementById("allowedUserNotes").value = "";
}

function collectNewActivityForm() {
  const category = document.getElementById("category").value;
  const yearBE = Number(document.getElementById("yearBE").value || 0);
  const month = Number(document.getElementById("month").value || 0);
  const day = Number(document.getElementById("day").value || 0);
  const activityName = document.getElementById("activityName").value.trim();
  const visibility = document.getElementById("visibility").value;
  if (!category || !yearBE || !month || !day || !activityName || !state.newFiles.length) {
    showStatus("uploadStatus", "error", "กรอกข้อมูลและเลือกไฟล์ให้ครบก่อน");
    return null;
  }
  return { category, yearBE, month, day, activityName, visibility };
}

function clearNewForm() {
  document.getElementById("category").value = "";
  document.getElementById("yearBE").value = String(CONFIG.CURRENT_YEAR_BE);
  document.getElementById("month").value = "";
  document.getElementById("day").innerHTML = '<option value="">เลือกวัน</option>';
  document.getElementById("activityPreset").value = "";
  document.getElementById("activityName").value = "";
  document.getElementById("visibility").value = "public";
  state.newFiles = [];
  renderFiles("new");
  validateNewUpload();
}

function requestClearNewForm() {
  if (state.newFiles.length && !window.confirm("ล้างข้อมูลกิจกรรมและไฟล์ที่เลือกทั้งหมดใช่หรือไม่")) return;
  clearNewForm();
  clearStatus("uploadStatus");
}

function clearAppendState(resetTarget = true) {
  state.appendFiles = [];
  renderFiles("append");
  if (resetTarget) {
    state.appendTarget = null;
    document.getElementById("appendTarget").value = "";
    document.getElementById("appendSelectedSummary").hidden = true;
  }
  validateAppendUpload();
}

async function getFreshIdToken() {
  if (!state.idToken) throw new Error("กรุณาเข้าสู่ระบบ Google ใหม่");
  return state.idToken;
}

async function apiGet(params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${query}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "เกิดข้อผิดพลาดจากระบบ");
  return data;
}

async function apiPost(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try {
    // Keep this a CORS-simple request; Apps Script web apps do not handle JSON preflight reliably.
    response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Apps Script ไม่ตอบสนองภายใน 30 วินาที กรุณาตรวจสอบการเผยแพร่เว็บแอป");
    }
    throw new Error("เชื่อมต่อ Apps Script ไม่สำเร็จ: " + error.message);
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "เกิดข้อผิดพลาดจากระบบ");
  return data;
}

function showOverlay(text, progress) {
  const value = Math.max(0, Math.min(progress, 100));
  const overlay = document.getElementById("progressOverlay");
  if (!overlay.classList.contains("show")) state.lastFocusedElement = document.activeElement;
  document.getElementById("progressText").textContent = text;
  document.getElementById("progressFill").style.width = `${value}%`;
  document.getElementById("progressBar").setAttribute("aria-valuenow", String(value));
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  overlay.querySelector(".overlay-card").focus();
}

function hideOverlay() {
  const overlay = document.getElementById("progressOverlay");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  if (state.lastFocusedElement?.focus) state.lastFocusedElement.focus();
  state.lastFocusedElement = null;
}

function showStatus(id, type, text) {
  const el = document.getElementById(id);
  el.className = `status ${type} show`;
  el.textContent = text;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  el.className = "status";
  el.textContent = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parseJwt(token) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => {
    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  }).join("")));
}
