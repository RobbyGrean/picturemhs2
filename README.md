# PICMHS2 — ระบบจัดเก็บและค้นหารูปภาพกิจกรรมด้วย Google Drive

PICMHS2 เป็นตัวอย่าง Web App แบบไม่ต้องดูแลเซิร์ฟเวอร์เอง ใช้ GitHub Pages เป็นหน้าเว็บ, Google Apps Script เป็น API และ policy layer, Google Drive เก็บไฟล์ และ Google Sheets เก็บ metadata สำหรับค้นหา

- เว็บไซต์ uploader: `https://<github-user>.github.io/<repository>/`
- เว็บไซต์ค้นหาสาธารณะ: `https://<github-user>.github.io/<repository>/public/`
- คู่มือบนเว็บไซต์: `https://<github-user>.github.io/<repository>/guide.html`
- Backend template สำหรับนำไปสร้างระบบของตนเอง: [`starter/Code.gs`](starter/Code.gs)
- Prompt สำหรับทำ UI/UX รอบถัดไป: [`UI_UX_REDESIGN_PROMPT.md`](UI_UX_REDESIGN_PROMPT.md)

> ข้อควรระวัง: Repository นี้เป็นตัวอย่างสถาปัตยกรรม ระบบจริงต้องเปลี่ยน Google Client ID, Apps Script URL, Drive folder ID, Spreadsheet ID และรายชื่อผู้ดูแลเป็นของตนเองก่อนใช้งาน

---

# Section 1 — อธิบายตัวโปรแกรม

## 1.1 ปัญหาที่โปรแกรมแก้

องค์กรจำนวนมากเก็บรูปกิจกรรมไว้ใน Google Drive แต่เมื่อข้อมูลเพิ่มขึ้นมักเกิดปัญหา:

- ตั้งชื่อและวางโฟลเดอร์ไม่เป็นรูปแบบเดียวกัน
- จำไม่ได้ว่ารูปอยู่ปี เดือน วัน หรือหมวดใด
- บุคลากรทั่วไปต้องถาม uploader เพื่อขอลิงก์ซ้ำ ๆ
- ผู้ที่มีหน้าที่อัปโหลดกับผู้ที่ต้องการเพียงค้นหารูปได้รับสิทธิ์มากเกินความจำเป็น
- การสร้างระบบใหม่มักต้องมี server, database และผู้ดูแลระบบ

PICMHS2 แยกผู้ใช้ออกเป็นสองกลุ่ม:

1. **Uploader** — ต้อง Google Sign-In, อยู่ใน allowlist และมีสิทธิ์ Editor บน Drive root จึงสร้างกิจกรรมและอัปโหลดได้
2. **Public visitor** — ไม่ต้องล็อกอิน ใช้ได้เฉพาะการค้นหา metadata ที่อนุญาตและเปิดโฟลเดอร์ Drive แบบ Viewer

## 1.2 ความสามารถหลัก

### ฝั่ง uploader

- Google Sign-In และตรวจ allowlist
- สร้างโครงสร้างโฟลเดอร์ตาม `หมวด/ปี/เดือน/วัน/ชื่อกิจกรรม`
- อัปโหลดหลายไฟล์ตรงจาก browser ไป Google Drive
- บันทึก metadata หนึ่งแถวต่อหนึ่งกิจกรรมลง Google Sheets
- ค้นหากิจกรรมเดิม
- อัปโหลดไฟล์เพิ่มเข้าโฟลเดอร์กิจกรรมเดิม

### ฝั่ง public

- ไม่โหลด Google Identity Services
- ไม่ขอ Drive OAuth token
- ค้นหาด้วยปี พ.ศ., เดือน, วัน, หมวด และชื่อกิจกรรม
- แสดงเฉพาะกิจกรรมที่มี `activity_status = active`
- เปิดโฟลเดอร์รูปใน Google Drive
- ไม่มี upload, create folder, metadata write หรือ administration capability

## 1.3 สถาปัตยกรรม

```text
Uploader ที่ได้รับอนุญาต
        |
        | Google ID token
        v
GitHub Pages uploader UI -------------------> Apps Script API
        |                                      | ตรวจ identity + allowlist
        |                                      | สร้างโฟลเดอร์
        |                                      ` เขียน/อ่าน metadata ใน Sheets
        |
        ` Drive access token ----------------> Google Drive API (upload ไฟล์ตรง)

Public visitor
        |
        v
GitHub Pages public UI ---------------------> Apps Script publicSearch
                                               ` อ่าน sanitized metadata เท่านั้น
```

องค์ประกอบของระบบ:

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| Uploader frontend | `index.html` บน GitHub Pages | Login, upload, authenticated search, append upload |
| Public frontend | `public/index.html` | ค้นหาแบบไม่ล็อกอินและเปิด Drive |
| User guide | `guide.html` | คู่มือการใช้งานบนเว็บไซต์ |
| Backend | Google Apps Script | Authentication boundary, folder creation, metadata API |
| File storage | Google Drive | เก็บรูปและวิดีโอจริง |
| Metadata | Google Sheets | เก็บข้อมูลที่ใช้ค้นหา |

## 1.4 ขอบเขตข้อมูลและ Source of Truth

ระบบนี้เป็น **metadata-driven search** ไม่ใช่ Drive crawler

- Google Sheets tab `uploads` คือ source of truth สำหรับระบบค้นหา
- Drive เก็บไฟล์จริง แต่ระบบไม่สแกน Drive ทุกครั้งที่ค้นหา
- หนึ่งแถวใน `uploads` แทนหนึ่งกิจกรรม ไม่ใช่หนึ่งไฟล์
- `file_count` เป็นค่าที่ระบบนับตอนอัปโหลด ไม่ใช่การนับไฟล์สดจาก Drive

### นโยบาย manual upload

กิจกรรมที่ต้องการให้ค้นหาเจอควรสร้างผ่านระบบ และไฟล์ที่ต้องการให้ระบบนับควรเพิ่มผ่านปุ่ม “อัปโหลดเพิ่ม”

หากผู้ใช้เพิ่ม ย้าย เปลี่ยนชื่อ หรือลบข้อมูลใน Drive โดยตรง:

- ระบบไม่รับประกันว่าจะค้นหาเจอ
- metadata และจำนวนไฟล์อาจไม่ตรงกับ Drive
- ระบบจะไม่ทำ automatic sync หรือ scan Drive ย้อนหลัง
- ถ้าเพิ่มไฟล์ manual เข้าโฟลเดอร์กิจกรรมเดิม ผู้เปิด Drive จะเห็นไฟล์ แต่ `file_count` อาจไม่เพิ่ม
- ข้อมูล manual ที่ต้องการแยกออกจากระบบจริง ๆ ควรอยู่นอก managed root

## 1.5 Permission และ Security Boundary

### Uploader

Uploader ปกติต้องผ่านสามชั้น:

1. เป็น OAuth test user หาก consent screen ยังอยู่ใน Testing
2. อยู่ใน Sheet tab `allowed_users` หรือเป็น admin ที่กำหนดไว้
3. มีสิทธิ์ Editor บน Drive root สำหรับ direct upload

### Public visitor

- เรียกได้เฉพาะ GET `action=publicSearch`
- ผลลัพธ์ไม่ส่งอีเมลหรือชื่อ uploader
- ไม่ส่ง `folderId`, internal folder path หรือข้อมูล write capability
- ทุก POST action และ authenticated search ยังต้องมี ID token
- Drive root สำหรับข้อมูลสาธารณะต้องเป็น `Anyone with the link — Viewer`

ลิงก์ Drive ไม่ใช่รหัสลับ ผู้ที่ได้รับลิงก์สามารถส่งต่อได้ จึงต้องใช้ public root เฉพาะกับข้อมูลที่องค์กรอนุญาตให้เผยแพร่เท่านั้น

## 1.6 ข้อจำกัดที่ยอมรับใน MVP

- ไม่มี gallery รายไฟล์ เพราะ metadata เก็บระดับกิจกรรม
- ไม่มี bulk ZIP download
- ไม่มี metadata edit/admin UI
- ไม่มี automatic Drive sync
- Apps Script อาจมี cold start; การค้นหาปกติมักใช้เวลาหลายวินาทีแม้ข้อมูลน้อย
- การค้นหาปัจจุบันอ่านแถว metadata แล้วกรองใน Apps Script จึงควรพิจารณา cache เมื่อจำนวนกิจกรรมเพิ่มขึ้น

---

# Section 2 — คู่มือการใช้งาน

คู่มือฉบับเว็บอยู่ที่ [`guide.html`](guide.html)

## 2.1 สำหรับผู้ค้นหารูปทั่วไป

1. เปิด URL `/public/`
2. เลือกตัวกรองที่ทราบ เช่น ปี เดือน วัน หรือหมวด
3. พิมพ์ชื่อกิจกรรมเต็มหรือคำบางส่วนได้
4. กด **ค้นหา**
5. อ่านชื่อกิจกรรม วันที่ หมวด และจำนวนไฟล์โดยประมาณ
6. กด **เปิดโฟลเดอร์รูป**
7. ใช้เครื่องมือของ Google Drive เพื่อเปิดหรือดาวน์โหลดไฟล์
8. กด **ล้างตัวกรอง** เมื่อต้องการเริ่มใหม่

หากไม่ใส่ตัวกรอง ระบบจะแสดงกิจกรรมล่าสุดจำนวนจำกัด ไม่ dump ข้อมูลทั้งหมด

## 2.2 สำหรับ uploader — เข้าสู่ระบบ

1. เปิดเว็บไซต์หลักที่ root URL
2. กด Google Sign-In
3. เลือกบัญชีที่ได้รับอนุญาต
4. อนุญาตสิทธิ์ Google Drive เมื่อระบบถาม
5. หากเข้าไม่ได้ ให้ admin ตรวจ OAuth test users, `allowed_users` และสิทธิ์ Editor บน Drive root

## 2.3 สำหรับ uploader — สร้างกิจกรรมใหม่

1. เลือกหมวด
2. เลือกปี พ.ศ., เดือน และวัน
3. เลือกชื่อสำเร็จรูปหรือพิมพ์ชื่อกิจกรรมเอง
4. เลือกรูปหรือวิดีโอ
5. ตรวจรายการไฟล์
6. กด **อัปโหลดกิจกรรมใหม่**
7. รอจนระบบสร้างโฟลเดอร์ อัปโหลดไฟล์ และบันทึก metadata ครบ
8. ห้ามปิดหน้า browser ระหว่างอัปโหลด

เมื่อสำเร็จ ระบบจะสร้างโครงสร้างประมาณนี้:

```text
PICMHS2/
└── หมวด/
    └── ปี พ.ศ./
        └── 07_กรกฎาคม/
            └── 15/
                └── ชื่อกิจกรรม/
```

## 2.4 สำหรับ uploader — ค้นหาและอัปโหลดเพิ่ม

1. เปิดแท็บค้นหา
2. กรอกตัวกรองหรือชื่อกิจกรรม
3. กด **ค้นหา**
4. เลือกกิจกรรมเป้าหมายจากผลลัพธ์
5. เลือกไฟล์ที่ต้องการเพิ่ม
6. กด **อัปโหลดเพิ่ม**
7. รอจน metadata อัปเดตเสร็จ

วิธีนี้ทำให้ `file_count`, `updated_at` และ `last_uploaded_by` อัปเดตตามระบบ

## 2.5 สิ่งที่ไม่ควรทำ

- ไม่ควรสร้างกิจกรรมใหม่ด้วยการสร้างโฟลเดอร์ใน Drive เอง
- ไม่ควรเปลี่ยนชื่อหรือย้ายโฟลเดอร์ที่ระบบสร้าง หากไม่แก้ metadata ให้ตรงกัน
- ไม่ควรลบโฟลเดอร์โดยไม่เปลี่ยน `activity_status` หรือจัดการ metadata
- ไม่ควรแชร์ Editor ให้บุคคลที่มีหน้าที่ค้นหาหรือดาวน์โหลดเพียงอย่างเดียว
- ไม่ควรนำ private/confidential activity ไว้ใต้ public root

## 2.6 การแก้ปัญหาเบื้องต้น

| อาการ | ตรวจสอบ |
|---|---|
| Login ไม่ได้ | OAuth origin, test user, `GOOGLE_CLIENT_ID`, allowlist |
| สร้างโฟลเดอร์ไม่ได้ | Apps Script deployment, owner access, root folder ID |
| อัปโหลดไฟล์ไม่ได้ | Drive API, `drive.file` scope, uploader เป็น Editor |
| ค้นหา public ไม่พบ | มีแถวใน `uploads`, status เป็น `active`, ตัวกรองถูกต้อง |
| เปิด Drive แล้วขอ Login | root/child sharing ต้องเป็น Anyone with link Viewer |
| จำนวนไฟล์ไม่ตรง | มี manual upload/delete; ระบบไม่ scan Drive อัตโนมัติ |
| Public Search ช้าเป็นบางครั้ง | Apps Script cold start; ลองใหม่และพิจารณา CacheService |

---

# Section 3 — การส่งต่อรากฐานและสร้างระบบของตนเองจากศูนย์

ส่วนนี้เขียนสำหรับผู้ที่ยังไม่เคยตั้งค่า Google Cloud, Apps Script หรือ GitHub Pages

## 3.1 สิ่งที่ต้องเตรียม

1. บัญชี Google ที่จะเป็นเจ้าของ Drive, Sheet และ Apps Script
2. บัญชี GitHub
3. Browser สมัยใหม่ เช่น Chrome หรือ Edge
4. รายชื่ออีเมล uploader
5. ข้อตกลงขององค์กรว่าข้อมูลใดเปิดสาธารณะได้

อ่านเอกสารทางการประกอบ:

- [Google Identity Services — Obtain a client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Google Drive API — Choose scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Google Apps Script — Web apps](https://developers.google.com/apps-script/guides/web)
- [GitHub Docs — Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## 3.2 สร้าง Google Drive root

1. เข้า Google Drive
2. กด **ใหม่ → โฟลเดอร์**
3. ตั้งชื่อ เช่น `MY-PICTURE-ARCHIVE`
4. เปิดโฟลเดอร์แล้วคัดลอก ID จาก URL

ตัวอย่าง:

```text
https://drive.google.com/drive/folders/THIS_PART_IS_FOLDER_ID
```

5. เพิ่ม uploader เป็น **Editor**
6. หากเป็น public archive ให้ตั้ง General access เป็น **Anyone with the link — Viewer**
7. หากมีทั้ง public และ private content ให้สร้าง root แยก ห้ามแชร์ root เดียวแบบสาธารณะ

## 3.3 สร้าง Google Spreadsheet

1. สร้าง Google Sheet ใหม่
2. เปลี่ยนชื่อไฟล์ เช่น `Picture Archive Metadata`
3. คัดลอก Spreadsheet ID จาก URL
4. สร้าง tab ชื่อ `uploads`
5. วาง header ต่อไปนี้ในแถวแรก เรียงตามลำดับ:

```text
upload_id
activity_key
category
year_be
month
day
activity_name
folder_path
folder_id
folder_url
uploaded_by
uploaded_by_name
file_count
uploaded_at
updated_at
last_uploaded_by
activity_status
```

6. สร้าง tab ชื่อ `allowed_users`
7. วาง header:

```text
email
display_name
is_active
notes
```

8. เพิ่ม uploader หนึ่งคนต่อหนึ่งแถว โดย `is_active` ใช้ `TRUE`

## 3.4 สร้าง Google Cloud project และ OAuth client

1. เข้า [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง project ใหม่
3. เปิด **Google Drive API**
4. ตั้งค่า OAuth consent screen/Google Auth Platform
5. เลือก audience ให้เหมาะกับองค์กร
6. หากอยู่ใน Testing ให้เพิ่ม uploader ทุกคนเป็น Test user
7. เพิ่ม scope `https://www.googleapis.com/auth/drive.file`
8. สร้าง OAuth Client ID ประเภท **Web application**
9. เพิ่ม Authorized JavaScript origins เช่น:

```text
http://127.0.0.1:5500
https://YOUR-GITHUB-USERNAME.github.io
```

ใส่เฉพาะ origin ไม่ใส่ path ของ repository

10. คัดลอก Client ID ที่ลงท้ายด้วย `.apps.googleusercontent.com`

## 3.5 สร้าง Apps Script backend

1. เข้า [script.google.com](https://script.google.com/)
2. สร้าง **New project**
3. เปิดไฟล์ [`starter/Code.gs`](starter/Code.gs)
4. คัดลอกโค้ดทั้งหมดไปแทน `Code.gs` ใน Apps Script
5. แก้ค่า config:

```javascript
ROOT_FOLDER_ID: "REPLACE_WITH_DRIVE_ROOT_FOLDER_ID"
METADATA_SHEET_ID: "REPLACE_WITH_METADATA_SPREADSHEET_ID"
ADMIN_EMAILS: ["owner@example.com", "backup-admin@example.com"]
```

6. เข้า **Project Settings → Script Properties**
7. เพิ่ม property:

```text
GOOGLE_CLIENT_ID = OAuth Client ID จากขั้นตอนก่อนหน้า
```

8. บันทึก project
9. กด **Deploy → New deployment → Web app**
10. ตั้ง **Execute as: Me** หรือเจ้าของระบบ
11. ตั้ง access ให้ endpoint ถูกเรียกจาก GitHub Pages ได้ โดย public MVP ต้องเข้าถึงได้แบบ Anyone
12. กด Deploy และอนุญาตสิทธิ์ Script
13. คัดลอก URL ที่ลงท้ายด้วย `/exec`

เมื่อแก้ `Code.gs` ภายหลัง ต้องเข้า **Deploy → Manage deployments → Edit → New version → Deploy** การกด Save อย่างเดียวไม่อัปเดต production deployment

## 3.6 ตั้งค่า frontend

### `index.html`

ค้นหา `const CONFIG` แล้วแทนค่า:

```javascript
APPS_SCRIPT_URL: "YOUR_APPS_SCRIPT_EXEC_URL"
GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID"
```

ปรับ `UPLOAD_YEARS`, `CATEGORIES` และ `ACTIVITY_PRESETS` ให้ตรงกับองค์กร

### `public/index.html`

แทนค่า:

```javascript
API_URL: "YOUR_APPS_SCRIPT_EXEC_URL"
```

ตรวจว่า `CATEGORIES` ตรงกับ `Code.gs` ทุกตัวอักษร

## 3.7 เผยแพร่ด้วย GitHub Pages

1. สร้าง GitHub repository
2. อัปโหลดโครงสร้าง:

```text
repository/
├── README.md
├── index.html
├── guide.html
├── public/
│   └── index.html
└── starter/
    └── Code.gs
```

3. เข้า **Settings → Pages**
4. เลือก Deploy from a branch
5. เลือก branch `main` และ folder `/ (root)`
6. กด Save และรอ build
7. เปิด root URL, `/public/` และ `/guide.html`
8. เพิ่ม GitHub Pages origin ใน OAuth client หากยังไม่ได้เพิ่ม

## 3.8 ตั้ง Permission ให้ครบ

| ผู้ใช้ | Apps Script | Drive | Application |
|---|---|---|---|
| Owner | Execute as owner | Owner | Admin |
| Uploader | เรียก API ด้วย ID token | Editor | อยู่ใน allowlist |
| Public visitor | เรียกเฉพาะ `publicSearch` | Viewer ผ่าน link | ไม่ต้องล็อกอิน |

ห้ามทำ POST action เป็น public และห้ามนำ uploader identity ไปใส่ใน public response

## 3.9 Checklist ทดสอบก่อนใช้งานจริง

### Uploader regression

- [ ] Login ด้วย uploader ที่อนุญาตได้
- [ ] บัญชีที่ไม่อนุญาตถูกปฏิเสธ
- [ ] สร้างกิจกรรมได้
- [ ] อัปโหลดไฟล์เข้า Drive ได้
- [ ] metadata ถูกเพิ่มหนึ่งแถว
- [ ] authenticated search หาเจอ
- [ ] append upload เพิ่มไฟล์และ file count ได้
- [ ] POST ที่ไม่มี ID token ถูกปฏิเสธ

### Public regression

- [ ] `/public/` เปิดใน Incognito ได้
- [ ] ค้นหาปี/เดือน/วัน/หมวดได้
- [ ] ค้นหาคำไทยบางส่วนได้
- [ ] inactive activity ไม่ปรากฏ
- [ ] JSON ไม่มีอีเมลหรือชื่อ uploader
- [ ] empty query ไม่ dump ทั้ง Sheet
- [ ] ผลลัพธ์ไม่เกิน 50 รายการ
- [ ] เปิดและดาวน์โหลดไฟล์จาก Drive โดยไม่ล็อกอินได้

## 3.10 การดูแลระยะยาว

- Backup Spreadsheet และตรวจ permission เป็นระยะ
- เก็บกิจกรรม private แยก root จาก public
- เพิ่ม/ปิด uploader ผ่าน `allowed_users`
- เปลี่ยน deployment version ทุกครั้งที่แก้ backend
- หลีกเลี่ยง manual upload ใน managed root
- เมื่อข้อมูลโต ให้เพิ่ม `CacheService` ก่อนพิจารณาเปลี่ยนฐานข้อมูล
- อย่าทำ Drive full scan อัตโนมัติ หากผู้ใช้ยอมรับว่า manual content อยู่นอกระบบ

## 3.11 สถานะรากฐานปัจจุบัน

Functional MVP ที่ยืนยันแล้ว:

- uploader login/create/upload/metadata flow ทำงาน
- public search endpoint ทำงานโดยไม่ต้อง authentication
- public Drive folder เปิดแบบ no-session ได้
- protected GET/POST actions ยังปฏิเสธ request ที่ไม่มี token
- frontend แยก uploader และ public search แล้ว

ก่อนประกาศ Stable Baseline v1 ควรทดสอบ append upload และ anonymous file download ซ้ำใน browser จริง หลังจากนั้นสามารถ redesign UI/UX ได้โดย freeze API contract และ permission boundary ตามเอกสารนี้

## 3.12 แนวทางต่อยอด

ลำดับที่แนะนำ:

1. Freeze functional baseline และ regression checklist
2. Redesign ทุก page/state โดยไม่เปลี่ยน API contract
3. เพิ่ม CacheService พร้อม invalidation หลัง save/append
4. เพิ่ม metadata edit/admin UI เฉพาะเมื่อมี policy ชัดเจน
5. เพิ่ม `public_visibility` และ public root แยก หากต้องรองรับข้อมูลผสม public/private
6. เพิ่ม file-level metadata เฉพาะเมื่อจำเป็นต้องมี gallery หรือ download รายไฟล์

---

## License และการนำไปใช้

นำโครงสร้างนี้ไปปรับใช้กับระบบจัดเก็บรูปขององค์กรตนเองได้ แต่ผู้ดูแลระบบต้องรับผิดชอบ permission, consent, privacy และนโยบายเผยแพร่ข้อมูลขององค์กรนั้น ๆ
