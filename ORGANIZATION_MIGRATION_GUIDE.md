# คู่มือยก PICMHS2 ไปใช้กับหน่วยงานอื่น

คู่มือนี้ใช้สำหรับสร้างระบบชุดใหม่ที่มีเจ้าของข้อมูล อีเมลผู้ดูแล Google Drive, Google Sheets, OAuth และ URL เป็นของหน่วยงานใหม่ทั้งหมด โดยไม่เชื่อมต่อกับทรัพยากรของ PICMHS2 เดิม

> หลักสำคัญ: ให้สร้าง Google Cloud project, Drive root, Spreadsheet และ Apps Script deployment ใหม่ ห้ามนำ ID หรือ URL production เดิมไปใช้ต่อ

## 1. ขอบเขตของระบบใหม่

ระบบยังคงแบ่งผู้ใช้ออกเป็น 3 กลุ่ม:

| กลุ่ม | ความสามารถ |
|---|---|
| Admin | อัปโหลด ค้นหา แก้ไข/ย้าย เปลี่ยน visibility, soft delete/restore และจัดการ uploader |
| Uploader | อัปโหลด ค้นหา เพิ่มไฟล์ และจัดการกิจกรรมตามสิทธิ์ที่ backend อนุญาต |
| Public visitor | ไม่ต้องล็อกอิน เห็นเฉพาะกิจกรรม `active + public` และเปิดโฟลเดอร์ Drive ที่แชร์ไว้ |

สถาปัตยกรรม:

```text
GitHub Pages
  ├─ Uploader/Admin UI
  ├─ Public Search
  └─ Guide
        │
        ▼
Google Apps Script Web App
  ├─ ตรวจ Google ID token
  ├─ ตรวจ Admin/allowed_users
  ├─ จัดการ metadata และ audit
  └─ ส่งเฉพาะข้อมูล public ที่อนุญาต
        │
        ├─ Google Drive: ไฟล์และโฟลเดอร์จริง
        └─ Google Sheets: uploads / allowed_users / activity_audit
```

## 2. เตรียมค่าของหน่วยงาน

กรอกข้อมูลต่อไปนี้ก่อนเริ่ม:

```text
ชื่อระบบ: ______________________________________
ชื่อหน่วยงาน: __________________________________
อีเมล Owner Admin: _____________________________
อีเมล Backup Admin: ____________________________
โดเมนหน่วยงาน: _________________________________
GitHub username/organization: __________________
ชื่อ repository: ________________________________
Public URL: ____________________________________
Drive root ID: __________________________________
Spreadsheet ID: _________________________________
OAuth Client ID: ________________________________
Apps Script /exec URL: __________________________
```

ห้าม commit token, OAuth client secret, access token หรือข้อมูลส่วนบุคคลที่ไม่จำเป็นลง GitHub

## 3. Fork หรือคัดลอก repository

1. Fork repository หรือสร้าง repository ใหม่จาก source ปัจจุบัน
2. เปิด GitHub Pages จาก branch `main` และ folder `/ (root)`
3. ถ้าใช้ custom domain ให้ตั้งค่า DNS และ HTTPS ให้เสร็จก่อนกำหนด OAuth origin
4. ตรวจว่า repository มี frontend และ backend source ที่ตรงกับ feature ปัจจุบัน

Backend ที่นำไป deploy ต้องมีฟังก์ชันอย่างน้อย:

```text
setupActivityManagement
updateActivity
archiveActivity
restoreActivity
publicSearch
publicLatest
```

ไฟล์ `starter/Code.gs` ปัจจุบันเป็น template ของ backend รุ่นเดียวกับ production แต่ต้องแทน Drive folder ID, Spreadsheet ID, Admin emails และ Script Property ก่อน deploy

## 4. สร้าง Google Drive ของหน่วยงาน

1. Login ด้วยบัญชีเจ้าของระบบ
2. สร้างโฟลเดอร์รากใหม่ เช่น `ORG-PictureDrive`
3. คัดลอก Folder ID จาก URL
4. ให้ Admin และ Uploader ที่ต้องอัปโหลดมีสิทธิ์เหมาะสม
5. กำหนดรูปแบบการเผยแพร่ก่อนเริ่มใช้งานจริง

### แบบคลังสาธารณะ

- Drive root/โฟลเดอร์ที่เผยแพร่ตั้งเป็น `Anyone with the link — Viewer`
- Public Search สามารถส่งผู้ใช้ไปเปิด Drive ได้โดยไม่ต้อง login

### แบบมีข้อมูลภายใน

- แนะนำให้แยก Drive root สาธารณะและภายในจริง
- `visibility = internal` ซ่อนกิจกรรมจาก Public Search แต่ไม่ได้ถอนสิทธิ์ลิงก์ Drive ที่เคยเปิดสาธารณะ
- ห้ามแชร์ root เดียวแบบ public หากภายในมีไฟล์ลับหรือข้อมูลส่วนบุคคล

## 5. สร้าง Google Sheets ใหม่

1. สร้าง Spreadsheet ใหม่ในบัญชีเจ้าของระบบ
2. คัดลอก Spreadsheet ID จาก URL
3. ไม่ต้องคัดลอกข้อมูล production เดิม หากต้องการระบบใหม่แบบสะอาด
4. Apps Script จะดูแลชีตเหล่านี้:

```text
uploads
allowed_users
activity_audit
```

หัวตาราง `allowed_users`:

```text
email | display_name | is_active | notes
```

ค่า `is_active` ใช้ `TRUE` หรือ `FALSE`

## 6. สร้าง Google Cloud project และ OAuth

1. สร้าง Google Cloud project ใหม่
2. เปิด Google Drive API
3. ตั้ง OAuth consent screen/Google Auth Platform
4. เลือก audience ให้ตรงกับรูปแบบบัญชีของหน่วยงาน
5. ถ้ายังอยู่ใน Testing ให้เพิ่ม Admin/Uploader ทุกคนเป็น Test user
6. เพิ่ม scope:

```text
https://www.googleapis.com/auth/drive.file
```

7. สร้าง OAuth Client ID ประเภท `Web application`
8. เพิ่ม Authorized JavaScript origins เช่น:

```text
http://127.0.0.1:5500
https://YOUR-GITHUB-USERNAME.github.io
https://photos.your-organization.example
```

ใส่เฉพาะ origin ห้ามใส่ path เช่น `/repository-name/`

## 7. ตั้งค่า Apps Script backend

สร้าง Apps Script project ใหม่ แล้วนำ `Code.gs` เวอร์ชันปัจจุบันไปวาง จากนั้นแก้ `CONFIG`:

```javascript
const CONFIG = {
  ROOT_FOLDER_ID: "DRIVE_ROOT_ID_ใหม่",
  METADATA_SHEET_ID: "SPREADSHEET_ID_ใหม่",
  SHEET_UPLOADS: "uploads",
  SHEET_ALLOWED_USERS: "allowed_users",
  SHEET_ACTIVITY_AUDIT: "activity_audit",
  TIME_ZONE: "Asia/Bangkok",
  CATEGORIES: ["กิจกรรมและอื่นๆ", "ไปราชการ", "ประชุม"],
  ADMIN_EMAILS: ["owner@your-org.example", "backup@your-org.example"]
};
```

ตรวจ `ensureAllowedUsersHeader()` ว่าห้าม hardcode อีเมลเดิม ควรเป็น:

```javascript
sheet.appendRow([
  CONFIG.ADMIN_EMAILS[0],
  "Owner Admin",
  true,
  "system owner"
]);
```

ใน Apps Script → Project Settings → Script Properties เพิ่ม:

```text
GOOGLE_CLIENT_ID = OAuth Client ID ของหน่วยงานใหม่
```

Client ID นี้ต้องตรงกับ frontend ทุกตัวอักษร

### เตรียมโครงสร้าง Sheet

เลือกฟังก์ชันต่อไปนี้แล้วกด Run:

```javascript
setupActivityManagement()
```

ตรวจผล:

- `uploads` มี header ครบ และ `visibility` อยู่คอลัมน์ R
- `activity_audit` ถูกสร้าง
- ข้อมูลเก่าที่ไม่มี visibility ถูก backfill เป็น `public` เฉพาะกรณีตั้งใจ migrate ข้อมูลเก่า
- `allowed_users` มีเฉพาะบัญชีของหน่วยงานใหม่

### Deploy Web App

1. Deploy → New deployment → Web app
2. Execute as: เจ้าของระบบ
3. ตั้ง access ให้ Public Search เรียก endpoint ได้
4. อนุญาตสิทธิ์ Script
5. คัดลอก URL ที่ลงท้าย `/exec`

เมื่อแก้ `Code.gs` ภายหลัง ต้องใช้:

```text
Deploy → Manage deployments → Edit → New version → Deploy
```

กด Save อย่างเดียวไม่อัปเดต production

## 8. ตั้งค่า frontend

### `assets/js/app.js`

แก้:

```javascript
APPS_SCRIPT_URL: "APPS_SCRIPT_EXEC_URL_ใหม่",
GOOGLE_CLIENT_ID: "OAUTH_CLIENT_ID_ใหม่",
CATEGORIES: ["หมวดของหน่วยงาน"],
ACTIVITY_PRESETS: ["ชื่อกิจกรรมที่ใช้บ่อย"]
```

### `public/index.html`

แก้:

```javascript
API_URL: "APPS_SCRIPT_EXEC_URL_ใหม่",
CATEGORIES: ["หมวดของหน่วยงาน"]
```

`CATEGORIES` ต้องตรงกันทุกตัวอักษรใน:

```text
Code.gs
assets/js/app.js
public/index.html
```

ถ้าเพิ่มหรือลดหมวด ให้แก้ `CATEGORY_COVER_FILES` ใน uploader และ public UI ด้วย หมวดที่ไม่มี mapping จะใช้ `activity.svg` เป็น fallback

ภาพประกอบอยู่ที่:

```text
assets/covers/activity.svg
assets/covers/travel.svg
assets/covers/meeting.svg
```

## 9. เปลี่ยนชื่อและ Branding

ค้นหาคำว่า `PICMHS2`, `MHS2`, URL repository เดิม และชื่อหน่วยงานเดิมใน:

```text
index.html
public/index.html
guide.html
README.md
assets/js/app.js
assets/covers/*.svg
```

ควรเปลี่ยน:

- ชื่อระบบและหน่วยงาน
- `<title>` และ meta description
- brand/โลโก้/สี ถ้าต้องการ
- ลิงก์ GitHub, คู่มือ และ Public Search
- ข้อความ privacy/consent ให้ตรงกับนโยบายองค์กร

## 10. ตั้ง Admin และ Uploader

Admin มาจาก:

```javascript
CONFIG.ADMIN_EMAILS
```

Uploader อื่นอยู่ใน `allowed_users` และต้องมี:

```text
email ตรงกับบัญชี Google
is_active = TRUE
สิทธิ์เข้าถึง Drive root
OAuth Test user หาก consent screen ยัง Testing
```

การลบ uploader ควรเปลี่ยน `is_active` เป็น `FALSE` และถอนสิทธิ์ Drive ด้วย การทำอย่างใดอย่างหนึ่งเพียงอย่างเดียวไม่ครบ

## 11. Deploy GitHub Pages

โครงสร้างขั้นต่ำ:

```text
repository/
├─ index.html
├─ guide.html
├─ public/index.html
├─ assets/css/app.css
├─ assets/js/app.js
└─ assets/covers/*.svg
```

หลัง push ให้ตรวจ:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/public/
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/guide.html
```

## 12. Test matrix ก่อนเปิดใช้จริง

### Authorization

- Admin login และเห็น Admin Hub
- Uploader login ได้แต่เรียก Admin action ไม่ได้
- อีเมลที่ไม่อยู่ allowlist ถูกปฏิเสธ
- token ที่ใช้ Client ID อื่นถูกปฏิเสธ

### Upload และ Search

- สร้างกิจกรรมใหม่ได้
- duplicate ถูกป้องกัน
- เพิ่มไฟล์ในกิจกรรมเดิมได้
- file count และ metadata ถูกอัปเดต

### Move/Rollback

- เปลี่ยนหมวด/วันที่/ชื่อแล้ว Drive folder ย้ายสำเร็จ
- folder ID และ URL เดิมยังคงเดิม
- ถ้า metadata update ล้มเหลวหลังย้าย Drive ต้อง rollback
- ถ้า Drive move ล้มเหลว metadata ต้องไม่เปลี่ยน

### Visibility

- `public` แสดงใน Public Search
- `internal` ไม่แสดงใน Public Search
- ผู้ใช้ภายในที่มีสิทธิ์ยังค้นหา internal ได้

### Soft delete

- archive แล้วหายจากผลค้นหาปกติและ public
- ไฟล์จริงใน Drive ไม่ถูกลบ
- Admin เห็นรายการ archived และ restore ได้

### Regression

- Login/logout
- upload ใหม่
- append files
- public latest สูงสุด 10 รายการ
- responsive 320px และ desktop
- ปุ่ม/Modal/Escape/กากบาททำงาน

## 13. Checklist ก่อนเปิด production

- [ ] ไม่มี Drive ID, Sheet ID, Apps Script URL หรืออีเมลของระบบเดิม
- [ ] Backend และ frontend ใช้ OAuth Client ID เดียวกัน
- [ ] Authorized JavaScript origin ถูกต้อง
- [ ] Admin/Uploader มี Drive permission ตามบทบาท
- [ ] Public Drive เปิดเฉพาะข้อมูลที่อนุญาต
- [ ] `CATEGORIES` ตรงกันทุกไฟล์
- [ ] `setupActivityManagement()` ผ่าน
- [ ] ทดสอบ authorization, move/rollback, visibility และ soft delete
- [ ] README/Guide/Privacy เป็นของหน่วยงานใหม่
- [ ] มีบัญชี Backup Admin หรือแผนกู้คืนเจ้าของระบบ

---

## Prompt สำหรับสั่ง AI แชทใหม่

คัดลอก Prompt ด้านล่าง กรอกค่าระหว่าง `<...>` แล้วส่งพร้อม repository หรือ workspace ให้ AI

```text
คุณกำลังย้ายระบบ PICMHS2 ไปใช้กับหน่วยงานใหม่ โปรดอ่านไฟล์
ORGANIZATION_MIGRATION_GUIDE.md, README.md, guide.html, Code.gs,
assets/js/app.js, index.html และ public/index.html ให้ครบก่อนแก้ไข

ข้อมูลระบบใหม่:
- ชื่อระบบ: <SYSTEM_NAME>
- ชื่อหน่วยงาน: <ORGANIZATION_NAME>
- Owner Admin: <OWNER_ADMIN_EMAIL>
- Backup Admin: <BACKUP_ADMIN_EMAIL>
- Drive root ID: <DRIVE_ROOT_ID>
- Spreadsheet ID: <SPREADSHEET_ID>
- OAuth Client ID: <GOOGLE_CLIENT_ID>
- Apps Script /exec URL: <APPS_SCRIPT_EXEC_URL>
- GitHub Pages origin: <GITHUB_PAGES_ORIGIN>
- Repository URL: <REPOSITORY_URL>
- หมวดกิจกรรม: <CATEGORY_LIST>
- ชื่อกิจกรรมที่ใช้บ่อย: <ACTIVITY_PRESET_LIST>
- รูปแบบ Drive: <PUBLIC_ONLY | SPLIT_PUBLIC_INTERNAL>

งานที่ต้องทำ:
1. ตรวจ repository และสรุปไฟล์ที่จะเปลี่ยนก่อนลงมือ
2. เปลี่ยน config ของ backend/frontend ให้เป็นของระบบใหม่ทั้งหมด
3. ห้ามคง ID, URL, อีเมล หรือ branding ของ PICMHS2 เดิม
4. ให้ ensureAllowedUsersHeader ใช้ CONFIG.ADMIN_EMAILS[0] ห้าม hardcode email
5. ตรวจว่า CATEGORIES ตรงกันใน Code.gs, assets/js/app.js และ public/index.html
6. ปรับ CATEGORY_COVER_FILES เมื่อจำนวนหมวดเปลี่ยน
7. อัปเดตชื่อระบบ, meta description, README และ guide
8. รักษา authorization, activity ownership, move/rollback, visibility,
   activity audit และ soft delete เดิม
9. ห้ามทำ protected POST action เป็น public
10. รัน tests สำหรับ authorization, move/rollback, visibility,
    soft delete, public search และ frontend regression
11. แสดงค่าที่ต้องตั้งเองใน Google Cloud, Apps Script Properties,
    Drive permissions และ GitHub Pages แยกเป็น checklist
12. อย่า commit secret, token หรือ OAuth client secret

ก่อน push ให้รายงานผลทดสอบ, diff summary และสิ่งที่ยังต้องทำด้วยมือ
ห้าม force push และห้าม deploy จนกว่าจะตรวจว่า target repository ถูกต้อง
```
