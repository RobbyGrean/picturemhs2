<a id="top"></a>

<div align="center">

<h1>📸 PICMHS2</h1>

<h3>คลังภาพกิจกรรมที่ค้นง่าย จัดการเป็นระบบ และทำงานบน Google Drive</h3>

<p>
  <img alt="สถานะพร้อมใช้งาน" src="https://img.shields.io/badge/STATUS-LIVE-147A45?style=for-the-badge">
  <img alt="Activity Management" src="https://img.shields.io/badge/ACTIVITY-MANAGEMENT-0B735F?style=for-the-badge">
  <img alt="ภาษาไทย" src="https://img.shields.io/badge/LANGUAGE-THAI-245A85?style=for-the-badge">
</p>

<p>
  <img alt="GitHub Pages" src="https://img.shields.io/badge/FRONTEND-GITHUB_PAGES-17342E?style=flat-square&logo=github">
  <img alt="Google Apps Script" src="https://img.shields.io/badge/BACKEND-APPS_SCRIPT-4285F4?style=flat-square&logo=googleappsscript&logoColor=white">
  <img alt="Google Drive" src="https://img.shields.io/badge/STORAGE-GOOGLE_DRIVE-FBBC04?style=flat-square&logo=googledrive&logoColor=white">
  <img alt="Google Sheets" src="https://img.shields.io/badge/METADATA-GOOGLE_SHEETS-34A853?style=flat-square&logo=googlesheets&logoColor=white">
</p>

<p>
  <strong><a href="https://robbygrean.github.io/picturemhs2/">🚀 เปิดระบบผู้อัปโหลด</a></strong>
  · <strong><a href="https://robbygrean.github.io/picturemhs2/public/">🔎 ค้นหารูปสาธารณะ</a></strong>
  · <strong><a href="https://robbygrean.github.io/picturemhs2/guide.html">📖 อ่านคู่มือ</a></strong>
</p>

</div>

---

PICMHS2 เป็น Web App แบบ serverless ใช้ GitHub Pages เป็นหน้าเว็บ, Google Apps Script เป็น API และ policy layer, Google Drive เก็บไฟล์ และ Google Sheets เก็บ metadata สำหรับค้นหา

> [!NOTE]
> เอกสารนี้อัปเดตตาม Activity Management รุ่นที่ใช้งานในเดือนกรกฎาคม 2569

## ✨ ภาพรวมในหนึ่งนาที

| 🔐 Uploader | 🗂️ Activity Management | 🌍 Public Search | ☁️ Google-native |
|---|---|---|---|
| Google Sign-In + allowlist | แก้ไข ย้าย ซ่อน ลบ และกู้คืน | ไม่ต้องล็อกอิน | ไม่ต้องดูแล server |
| อัปโหลดหลายไฟล์ | รักษา folder ID และ URL | กิจกรรมล่าสุด 10 รายการ | Drive + Sheets + Apps Script |
| เพิ่มไฟล์ในกิจกรรมเดิม | owner/Admin authorization | กรองเฉพาะ active/public | GitHub Pages frontend |

## 🗺️ สารบัญ

- [🌿 ภาพรวมระบบ](#overview)
- [📘 คู่มือการใช้งาน](#user-guide)
- [🛠️ ติดตั้งและสร้างระบบ](#installation)
- [✅ Checklist ก่อนใช้งานจริง](#production-checklist)
- [🎨 UI/UX Design System](#design-system)

> [!IMPORTANT]
> เมื่อนำโครงสร้างนี้ไปใช้กับระบบอื่น ต้องเปลี่ยน Google Client ID, Apps Script URL, Drive folder ID, Spreadsheet ID และรายชื่อผู้ดูแล ห้ามใช้ค่าของ PICMHS2

---

<a id="overview"></a>

![Section 1](https://img.shields.io/badge/SECTION_01-OVERVIEW-0B735F?style=for-the-badge)

# 🌿 ภาพรวมระบบ

## 1.1 🎯 ปัญหาที่โปรแกรมแก้

องค์กรจำนวนมากเก็บรูปกิจกรรมไว้ใน Google Drive แต่เมื่อข้อมูลเพิ่มขึ้นมักเกิดปัญหา:

- ตั้งชื่อและวางโฟลเดอร์ไม่เป็นรูปแบบเดียวกัน
- จำไม่ได้ว่ารูปอยู่ปี เดือน วัน หรือหมวดใด
- บุคลากรทั่วไปต้องถาม uploader เพื่อขอลิงก์ซ้ำ ๆ
- ผู้ที่มีหน้าที่อัปโหลดกับผู้ที่ต้องการเพียงค้นหารูปได้รับสิทธิ์มากเกินความจำเป็น
- การสร้างระบบใหม่มักต้องมี server, database และผู้ดูแลระบบ

PICMHS2 แยกสิทธิ์ผู้ใช้ออกเป็นสามกลุ่ม:

1. **Activity owner / Uploader** — ต้อง Google Sign-In, อยู่ใน allowlist และมีสิทธิ์ Editor บน Drive root ผู้สร้างกิจกรรมเป็นเจ้าของกิจกรรมนั้น
2. **Admin** — จัดการ uploader และจัดการกิจกรรมของทุกคนภายในช่วงปีที่แก้ไขได้ รวมถึงกู้คืนรายการที่ลบ
3. **Public visitor** — ไม่ต้องล็อกอิน ค้นหาได้เฉพาะกิจกรรม `active` ที่ตั้งเป็น `public`

## 1.2 ✨ ความสามารถหลัก

### ฝั่ง uploader

- Google Sign-In และตรวจ allowlist
- สร้างโครงสร้างโฟลเดอร์ตาม `หมวด/ปี/เดือน/วัน/ชื่อกิจกรรม`
- อัปโหลดหลายไฟล์ตรงจาก browser ไป Google Drive
- บันทึก metadata หนึ่งแถวต่อหนึ่งกิจกรรมลง Google Sheets
- ค้นหากิจกรรมเดิม
- อัปโหลดไฟล์เพิ่มเข้าโฟลเดอร์กิจกรรมเดิม
- เจ้าของกิจกรรมหรือ Admin แก้หมวด วันที่ ชื่อ และการเผยแพร่ได้
- ย้ายหรือเปลี่ยนชื่อโฟลเดอร์เดิมโดยรักษา folder ID, URL และไฟล์
- ลบกิจกรรมออกจากระบบค้นหาแบบ soft delete โดยไม่ลบไฟล์ใน Drive
- Admin ดูรายการที่ลบแล้วและกู้คืนได้
- Admin เพิ่ม แก้ไข เปิด หรือปิดสิทธิ์ uploader จากหน้าเว็บไซต์

### ฝั่ง public

- ไม่โหลด Google Identity Services
- ไม่ขอ Drive OAuth token
- แสดงกิจกรรมล่าสุดที่เผยแพร่สูงสุด 10 รายการ
- บังคับเลือกปี พ.ศ. ก่อนค้นหา ส่วนเดือน วัน หมวด และชื่อกิจกรรมเป็นตัวเลือก
- แสดงเฉพาะ `activity_status = active` และ `visibility = public`
- เปิดโฟลเดอร์รูปใน Google Drive
- ไม่มี upload, create folder, metadata write หรือ administration capability

## 1.3 🧩 สถาปัตยกรรม

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
GitHub Pages public UI ---------------------> Apps Script publicSearch/publicLatest
                                               ` อ่าน sanitized metadata เท่านั้น
```

องค์ประกอบของระบบ:

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| Uploader frontend | `index.html` บน GitHub Pages | Login, upload, search, append, edit/move, visibility, soft delete/restore |
| Public frontend | `public/index.html` | กิจกรรมล่าสุด ค้นหาแบบไม่ล็อกอิน และเปิด Drive |
| User guide | `guide.html` | คู่มือการใช้งานบนเว็บไซต์ |
| Backend | Google Apps Script | Authentication boundary, folder creation, metadata API |
| File storage | Google Drive | เก็บรูปและวิดีโอจริง |
| Metadata | Google Sheets | เก็บข้อมูลที่ใช้ค้นหา |

## 1.4 🗂️ ขอบเขตข้อมูลและ Source of Truth

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

## 1.5 🔐 Permission และ Security Boundary

### Uploader

Uploader ปกติต้องผ่านสามชั้น:

1. เป็น OAuth test user หาก consent screen ยังอยู่ใน Testing
2. อยู่ใน Sheet tab `allowed_users` หรือเป็น admin ที่กำหนดไว้
3. มีสิทธิ์ Editor บน Drive root สำหรับ direct upload

`notes` ใน `allowed_users` เป็นคำอธิบายเท่านั้น ไม่ใช้ตัดสิน role โดย Admin มาจาก `CONFIG.ADMIN_EMAILS` ใน backend ส่วนอีเมลอื่นที่ active ใน `allowed_users` เป็น uploader และเรียก API จัดการผู้ใช้ไม่ได้

### Public visitor

- เรียกได้เฉพาะ GET `action=publicSearch` และ `action=publicLatest`
- ผลลัพธ์ไม่ส่งอีเมลหรือชื่อ uploader
- ไม่ส่ง `folderId`, internal folder path หรือข้อมูล write capability
- ทุก POST action และ authenticated search ยังต้องมี ID token
- Drive root สำหรับข้อมูลสาธารณะต้องเป็น `Anyone with the link — Viewer`

### เจ้าของกิจกรรมและช่วงปีที่แก้ไขได้

- `uploaded_by` จาก verified ID token ตอนสร้างแถวครั้งแรกคือเจ้าของกิจกรรม
- `last_uploaded_by` ไม่ทำให้ผู้ที่อัปโหลดเพิ่มกลายเป็นเจ้าของ
- เจ้าของและ Admin แก้ไข ย้าย เปลี่ยน visibility หรือลบกิจกรรมได้เฉพาะปีปัจจุบันและย้อนหลังสองปีตามเวลา Bangkok
- uploader คนอื่นอัปโหลดเพิ่มได้เฉพาะกิจกรรม active ในช่วงปีเดียวกัน แต่แก้ไขหรือลบไม่ได้
- กิจกรรมเก่ากว่านั้นยังค้นหาและเปิด Drive ได้ แต่เป็น read-only

`visibility = internal` หมายถึงไม่แสดงบนเว็บสาธารณะ ไม่ใช่การทำ Drive ให้เป็น private ผู้ที่มีลิงก์ Drive เดิมอาจยังเปิดได้ตามสิทธิ์ที่ตั้งไว้ หากต้องการข้อมูลลับจริงต้องใช้ permission/root แยก

## 1.6 ⚠️ ข้อจำกัดที่ยอมรับใน MVP

- ไม่มี gallery รายไฟล์ เพราะ metadata เก็บระดับกิจกรรม
- ไม่มี bulk ZIP download
- ไม่มี permanent delete จาก Drive
- ไม่มีการโอนเจ้าของกิจกรรม
- ไม่มีการแก้ไขหรืออัปโหลดเพิ่มให้กิจกรรมเก่ากว่าช่วงสามปี
- ไม่มี automatic Drive sync
- Apps Script อาจมี cold start; การค้นหาปกติมักใช้เวลาหลายวินาทีแม้ข้อมูลน้อย
- การค้นหาปัจจุบันอ่านแถว metadata แล้วกรองใน Apps Script จึงควรพิจารณา cache เมื่อจำนวนกิจกรรมเพิ่มขึ้น

<p align="right"><a href="#top">⬆️ กลับด้านบน</a></p>

---

<a id="user-guide"></a>

![Section 2](https://img.shields.io/badge/SECTION_02-USER_GUIDE-245A85?style=for-the-badge)

# 📘 คู่มือการใช้งาน

คู่มือฉบับเว็บอยู่ที่ [`guide.html`](guide.html)

## 2.1 🔎 สำหรับผู้ค้นหารูปทั่วไป

1. เปิด URL `/public/`
2. ดูกิจกรรมล่าสุดที่เผยแพร่ได้ทันที สูงสุด 10 รายการ
3. เมื่อต้องการค้นหา ให้เลือกปี พ.ศ. ก่อนทุกครั้ง
4. เลือกเดือน วัน หรือหมวดเพิ่มเติมได้ตามข้อมูลที่ทราบ
5. พิมพ์ชื่อกิจกรรมเต็มหรือคำบางส่วนได้
6. กด **ค้นหา**
7. อ่านชื่อกิจกรรม วันที่ หมวด และจำนวนไฟล์โดยประมาณ
8. กด **เปิดโฟลเดอร์รูป**
9. ใช้เครื่องมือของ Google Drive เพื่อเปิดหรือดาวน์โหลดไฟล์
10. กด **ล้างตัวกรอง** เมื่อต้องการเริ่มใหม่

การค้นหาสาธารณะไม่อนุญาตให้เว้นปีว่าง กิจกรรมล่าสุดเป็น dashboard แยกจากผลค้นหา

## 2.2 🔑 สำหรับ uploader — เข้าสู่ระบบ

1. เปิดเว็บไซต์หลักที่ root URL
2. กด Google Sign-In
3. เลือกบัญชีที่ได้รับอนุญาต
4. อนุญาตสิทธิ์ Google Drive เมื่อระบบถาม
5. หากเข้าไม่ได้ ให้ admin ตรวจ OAuth test users, `allowed_users` และสิทธิ์ Editor บน Drive root

## 2.3 📤 สำหรับ uploader — สร้างกิจกรรมใหม่

1. เลือกหมวด
2. เลือกปี พ.ศ. ภายในปีปัจจุบันและย้อนหลังสองปี แล้วเลือกเดือนและวัน
3. เลือกชื่อสำเร็จรูปหรือพิมพ์ชื่อกิจกรรมเอง
4. เลือกการเผยแพร่: `public` หรือ `internal` ค่าเริ่มต้นคือ `public`
5. เลือกรูปหรือวิดีโอ
6. ตรวจรายการไฟล์
7. กด **อัปโหลดกิจกรรมใหม่**
8. รอจนระบบสร้างโฟลเดอร์ อัปโหลดไฟล์ และบันทึก metadata ครบ
9. ห้ามปิดหน้า browser ระหว่างอัปโหลด

ถ้ามีกิจกรรม active ที่มีหมวด วันที่ และชื่อเดียวกัน ระบบจะไม่สร้างแถวซ้ำ ให้ค้นหาแล้วใช้ **อัปโหลดเพิ่ม**

เมื่อสำเร็จ ระบบจะสร้างโครงสร้างประมาณนี้:

```text
PICMHS2/
└── หมวด/
    └── ปี พ.ศ./
        └── 07_กรกฎาคม/
            └── 15/
                └── ชื่อกิจกรรม/
```

## 2.4 ➕ สำหรับ uploader — ค้นหาและอัปโหลดเพิ่ม

1. เปิดแท็บค้นหา
2. เลือกปี พ.ศ. ก่อนค้นหา ตัวกรองอื่นเป็นตัวเลือก
3. กด **ค้นหา**
4. เลือกกิจกรรมเป้าหมายจากผลลัพธ์
5. เลือกไฟล์ที่ต้องการเพิ่ม
6. กด **อัปโหลดเพิ่ม**
7. รอจน metadata อัปเดตเสร็จ

วิธีนี้ทำให้ `file_count`, `updated_at` และ `last_uploaded_by` อัปเดตตามระบบ

กิจกรรมเก่ากว่าปีปัจจุบันย้อนหลังสองปีจะแสดงป้ายอ่านอย่างเดียว เปิด Drive ได้ แต่ไม่มีปุ่มอัปโหลดเพิ่ม แก้ไข หรือลบ

## 2.5 ✏️ สำหรับเจ้าของกิจกรรมหรือ Admin — แก้ไขและย้าย

1. เปิดแท็บ **ค้นหา / อัปโหลดเพิ่ม** และเลือกปี
2. ค้นหากิจกรรมแล้วกด **แก้ไข/ย้ายกิจกรรม**
3. แก้หมวด ปี เดือน วัน ชื่อกิจกรรม หรือการเผยแพร่
4. กด **บันทึกการแก้ไข**
5. หากปลายทางมีชื่อซ้ำ ระบบเติม `(1)`, `(2)` ต่อท้าย โดยไม่รวมโฟลเดอร์เข้าด้วยกัน

การย้ายหรือเปลี่ยนชื่อผ่านระบบรักษา folder ID, URL, เจ้าของเดิม และไฟล์ทั้งหมดไว้ หากต้องการปิดหน้าต่าง ใช้ปุ่ม **ยกเลิก**, ปุ่ม **×** หรือกด `Escape`

## 2.6 👁️ การเผยแพร่และการลบกิจกรรม

- **เผยแพร่และบุคคลทั่วไปค้นหาได้ (`public`)** — แสดงใน Public Search และกิจกรรมล่าสุด
- **ไม่เผยแพร่ (`internal`)** — แสดงเฉพาะผู้ใช้ที่ล็อกอิน แต่ผู้มีลิงก์ Drive เดิมอาจยังเปิดได้
- **ลบกิจกรรมนี้** — เปลี่ยน `activity_status` เป็น `archived` และซ่อนจากผลค้นหาทั้งหมด ไฟล์ใน Drive ไม่ถูกลบ
- เฉพาะ Admin เปิดตัวกรองรายการที่ลบแล้วและกู้คืนได้

## 2.7 👥 สำหรับ Admin — จัดการ uploader

1. Login ด้วยอีเมลที่อยู่ใน `CONFIG.ADMIN_EMAILS`
2. เปิดแท็บ **จัดการ uploader**
3. กรอกอีเมล ชื่อที่แสดง และ notes
4. กด **บันทึก uploader** ผู้ใช้ใหม่จะเป็น role uploader เสมอ
5. เพิ่มอีเมลเดียวกันเป็น **Editor** บน Drive root ด้วยตนเอง ระบบจะไม่เปลี่ยน Drive sharing อัตโนมัติ
6. ใช้ **ปิดสิทธิ์** เมื่อต้องการระงับการเข้าใช้งาน โดยระบบตั้ง `is_active = FALSE` และไม่ลบแถว
7. ใช้ **เปิดสิทธิ์** เมื่อต้องการให้กลับมาใช้งาน

Uploader ทั่วไปจะไม่เห็นแท็บนี้ และ backend จะปฏิเสธ request แม้พยายามเรียก API โดยตรง

## 2.8 🚫 สิ่งที่ไม่ควรทำ

- ไม่ควรสร้างกิจกรรมใหม่ด้วยการสร้างโฟลเดอร์ใน Drive เอง
- ไม่ควรเปลี่ยนชื่อหรือย้ายโฟลเดอร์ที่ระบบสร้างใน Drive ให้ใช้ปุ่ม **แก้ไข/ย้ายกิจกรรม**
- ไม่ควรลบโฟลเดอร์ใน Drive ให้ใช้ **ลบกิจกรรมนี้** ซึ่งเป็น soft delete
- ไม่ควรแชร์ Editor ให้บุคคลที่มีหน้าที่ค้นหาหรือดาวน์โหลดเพียงอย่างเดียว
- ไม่ควรคิดว่า `internal` ทำให้ Drive private หากเป็นข้อมูลลับต้องตรวจ permission หรือใช้ root แยก

## 2.9 🩺 การแก้ปัญหาเบื้องต้น

| อาการ | ตรวจสอบ |
|---|---|
| Login ไม่ได้ | OAuth origin, test user, `GOOGLE_CLIENT_ID`, allowlist |
| สร้างโฟลเดอร์ไม่ได้ | Apps Script deployment, owner access, root folder ID |
| อัปโหลดไฟล์ไม่ได้ | Drive API, `drive.file` scope, uploader เป็น Editor |
| ค้นหา public ไม่พบ | เลือกปีแล้ว, status เป็น `active`, visibility เป็น `public`, ตัวกรองถูกต้อง |
| ไม่มีปุ่มแก้ไข/ลบ | ต้องเป็นเจ้าของกิจกรรมหรือ Admin และกิจกรรมอยู่ในช่วงปีที่แก้ไขได้ |
| กิจกรรมแสดงว่าอ่านอย่างเดียว | กิจกรรมเก่ากว่าปีปัจจุบันย้อนหลังสองปี จึงแก้ไขและอัปโหลดเพิ่มไม่ได้ |
| เปิด Drive แล้วขอ Login | root/child sharing ต้องเป็น Anyone with link Viewer |
| จำนวนไฟล์ไม่ตรง | มี manual upload/delete; ระบบไม่ scan Drive อัตโนมัติ |
| Public Search ช้าเป็นบางครั้ง | Apps Script cold start; ลองใหม่และพิจารณา CacheService |
| ไม่เห็นแท็บจัดการ uploader | ต้อง Login ใหม่ด้วยอีเมลที่อยู่ใน `CONFIG.ADMIN_EMAILS` |

<p align="right"><a href="#top">⬆️ กลับด้านบน</a></p>

---

<a id="installation"></a>

![Section 3](https://img.shields.io/badge/SECTION_03-INSTALLATION-8A5A00?style=for-the-badge)

# 🛠️ ติดตั้งและสร้างระบบของคุณเอง

ส่วนนี้เขียนสำหรับผู้ที่ยังไม่เคยตั้งค่า Google Cloud, Apps Script หรือ GitHub Pages

## 3.1 📋 สิ่งที่ต้องเตรียม

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

## 3.2 📁 สร้าง Google Drive root

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

## 3.3 📊 สร้าง Google Spreadsheet

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
visibility
```

คอลัมน์ `visibility` ต้องอยู่คอลัมน์ R ค่าใช้ได้คือ `public` หรือ `internal`

`activity_status` และ `visibility` เป็นคนละเรื่อง:

```text
activity_status = active | archived
visibility      = public | internal
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
9. ไม่จำเป็นต้องสร้าง `activity_audit` เอง ฟังก์ชัน migration จะสร้างพร้อม header ให้

`activity_audit` เก็บ `audit_id`, `upload_id`, `folder_id`, `action`, `actor_email`, `occurred_at`, `before_json`, `after_json`, `result` และ `error_message` ห้ามเปิดข้อมูลชีตนี้ผ่าน public API

## 3.4 ☁️ สร้าง Google Cloud project และ OAuth client

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

## 3.5 ⚙️ สร้าง Apps Script backend

1. เข้า [script.google.com](https://script.google.com/)
2. สร้าง **New project**
3. เปิดไฟล์ [`Code.gs`](Code.gs)
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
9. เลือกฟังก์ชัน `setupActivityManagement()` แล้วกด Run หนึ่งครั้ง เพื่อเพิ่ม/backfill `visibility` และสร้าง `activity_audit`
10. ตรวจว่า `uploads!R1` เป็น `visibility`, แถวเดิมเป็น `public` และมี tab `activity_audit`
11. กด **Deploy → New deployment → Web app**
12. ตั้ง **Execute as: Me** หรือเจ้าของระบบ
13. ตั้ง access ให้ endpoint ถูกเรียกจาก GitHub Pages ได้ โดย public search ต้องเข้าถึงได้แบบ Anyone
14. กด Deploy และอนุญาตสิทธิ์ Script
15. คัดลอก URL ที่ลงท้ายด้วย `/exec`

เมื่อแก้ `Code.gs` ภายหลัง ต้องเข้า **Deploy → Manage deployments → Edit → New version → Deploy** การกด Save อย่างเดียวไม่อัปเดต production deployment

## 3.6 🖥️ ตั้งค่า frontend

### `index.html`

ค้นหา `const CONFIG` แล้วแทนค่า:

```javascript
APPS_SCRIPT_URL: "YOUR_APPS_SCRIPT_EXEC_URL"
GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID"
```

ปรับ `CATEGORIES` และ `ACTIVITY_PRESETS` ให้ตรงกับองค์กร ปีที่สร้าง/แก้ไขได้คำนวณอัตโนมัติตามเวลา Bangkok ไม่ใช้รายการ `UPLOAD_YEARS`

### `public/index.html`

แทนค่า:

```javascript
API_URL: "YOUR_APPS_SCRIPT_EXEC_URL"
```

ตรวจว่า `CATEGORIES` ตรงกับ `Code.gs` ทุกตัวอักษร

## 3.7 🚀 เผยแพร่ด้วย GitHub Pages

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

## 3.8 🛡️ ตั้ง Permission ให้ครบ

| ผู้ใช้ | Apps Script | Drive | Application |
|---|---|---|---|
| Owner | Execute as owner | Owner | Admin |
| Uploader | เรียก API ด้วย ID token | Editor | อยู่ใน allowlist |
| Public visitor | เรียกเฉพาะ `publicSearch`/`publicLatest` | Viewer ผ่าน link | ไม่ต้องล็อกอิน |

ห้ามทำ POST action เป็น public และห้ามนำ uploader identity ไปใส่ใน public response

<a id="production-checklist"></a>

## 3.9 ✅ Checklist ทดสอบก่อนใช้งานจริง

### Uploader regression

- [ ] Login ด้วย uploader ที่อนุญาตได้
- [ ] บัญชีที่ไม่อนุญาตถูกปฏิเสธ
- [ ] สร้างกิจกรรมได้
- [ ] อัปโหลดไฟล์เข้า Drive ได้
- [ ] metadata ถูกเพิ่มหนึ่งแถว
- [ ] authenticated search หาเจอ
- [ ] authenticated search บังคับเลือกปีและจำกัดผล 50 รายการ
- [ ] append upload เพิ่มไฟล์และ file count ได้
- [ ] uploader ที่อัปโหลดเพิ่มไม่สามารถแก้ไขหรือลบกิจกรรมของเจ้าของเดิม
- [ ] เจ้าของและ Admin แก้ชื่อ วันที่ หมวด และ visibility ได้ในช่วงสามปี
- [ ] การย้ายรักษา folder ID, URL และไฟล์เดิม
- [ ] destination collision เติม `(1)`, `(2)` โดยไม่ merge
- [ ] soft delete ซ่อนรายการแต่ไม่ลบ Drive และ Admin กู้คืนได้
- [ ] กิจกรรมเก่าแสดงแบบ read-only และอัปโหลดเพิ่มไม่ได้
- [ ] POST ที่ไม่มี ID token ถูกปฏิเสธ

### Public regression

- [ ] `/public/` เปิดใน Incognito ได้
- [ ] dashboard ล่าสุดแสดงไม่เกิน 10 กิจกรรม active/public
- [ ] ค้นหาปี/เดือน/วัน/หมวดได้
- [ ] การค้นหาบังคับเลือกปี
- [ ] ค้นหาคำไทยบางส่วนได้
- [ ] archived และ internal activity ไม่ปรากฏ
- [ ] JSON ไม่มีอีเมลหรือชื่อ uploader
- [ ] ผลลัพธ์ไม่เกิน 50 รายการ
- [ ] เปิดและดาวน์โหลดไฟล์จาก Drive โดยไม่ล็อกอินได้

## 3.10 🔧 การดูแลระยะยาว

- Backup Spreadsheet และตรวจ permission เป็นระยะ
- ตรวจว่า `internal` ไม่ปรากฏบนเว็บสาธารณะ และจำไว้ว่ายังเป็น unlisted ไม่ใช่ Drive private
- เก็บข้อมูลลับจริงใน root/permission แยก
- เพิ่ม/ปิด uploader ผ่าน `allowed_users`
- ตรวจ `activity_audit` เมื่อมีการแก้ไข ย้าย เปลี่ยน visibility ลบ หรือกู้คืน
- เปลี่ยน deployment version ทุกครั้งที่แก้ backend
- หลีกเลี่ยง manual upload ใน managed root
- เมื่อข้อมูลโต ให้เพิ่ม `CacheService` ก่อนพิจารณาเปลี่ยนฐานข้อมูล
- อย่าทำ Drive full scan อัตโนมัติ หากผู้ใช้ยอมรับว่า manual content อยู่นอกระบบ

## 3.11 🟢 สถานะรากฐานปัจจุบัน

Functional MVP ที่ยืนยันแล้ว:

- uploader login/create/upload/metadata flow ทำงาน
- admin-only allowed user management มี backend authorization แยกจากการซ่อนปุ่มใน UI
- owner/Admin edit, move, visibility, soft delete และ Admin restore ทำงาน
- duplicate guard, collision suffix และ compensating rollback มี regression tests
- public search และ latest dashboard ทำงานโดยไม่ต้อง authentication
- public endpoint กรอง archived/internal และไม่เผย uploader identity
- public Drive folder เปิดแบบ no-session ได้
- protected GET/POST actions ยังปฏิเสธ request ที่ไม่มี token
- frontend แยก uploader และ public search แล้ว

การ deploy backend ต้องสร้าง Apps Script version ใหม่ ส่วนการแก้ `index.html`, `public/index.html` หรือ `guide.html` ใช้การ deploy GitHub Pages เท่านั้น

## 3.12 🧭 แนวทางต่อยอด

ลำดับที่แนะนำ:

1. เพิ่ม CacheService พร้อม invalidation หลัง mutation เมื่อข้อมูลโต
2. เพิ่มเครื่องมือตรวจ duplicate/orphan สำหรับ Admin
3. เพิ่ม workflow จัดการไฟล์/metadata ที่อัปโหลดสำเร็จแต่การบันทึก metadata ล้มเหลว
4. เพิ่ม file-level metadata เฉพาะเมื่อจำเป็นต้องมี gallery หรือ download รายไฟล์
5. พิจารณา root/permission แยก หากต้องรองรับข้อมูลลับจริง

<a id="design-system"></a>

## 3.13 🎨 UI/UX Design System

ทุกหน้าของระบบใช้ visual language เดียวกันแบบ modern institutional โดยคงเป็น static HTML/CSS/JavaScript:

- สีหลัก `#0b735f` และสีเข้ม `#075949`
- พื้นหลัง mint/neutral อ่อน, surface สีขาว และข้อความเขียว-charcoal
- Noto Sans Thai พร้อมระยะบรรทัดสำหรับข้อความภาษาไทย
- ช่องกรอกและปุ่มมี touch target อย่างน้อยประมาณ 44px
- card radius ระดับกลาง, border บาง และ shadow เบาเฉพาะจุดที่ต้องการลำดับชั้น
- focus ring 3px, status แยก info/success/warning/error ด้วยข้อความและสัญลักษณ์ ไม่ใช้สีเพียงอย่างเดียว
- mobile-first ตั้งแต่ 320px, รองรับ zoom 200% และ `prefers-reduced-motion`

Component หลักที่ใช้ร่วมกัน ได้แก่ header/navigation, button, form field, tabs, panel/card, status banner, file item, result card, user card, empty state และ progress dialog

---

## 📄 License และการนำไปใช้

นำโครงสร้างนี้ไปปรับใช้กับระบบจัดเก็บรูปขององค์กรตนเองได้ แต่ผู้ดูแลระบบต้องรับผิดชอบ permission, consent, privacy และนโยบายเผยแพร่ข้อมูลขององค์กรนั้น ๆ

---

<div align="center">

<p><strong>PICMHS2 · จัดเก็บเป็นระบบ ค้นหาได้เร็ว ดูแลสิทธิ์ได้ชัดเจน</strong></p>

<p>
  <a href="#top">⬆️ กลับด้านบน</a>
  · <a href="https://robbygrean.github.io/picturemhs2/">🚀 เปิดระบบ</a>
  · <a href="https://robbygrean.github.io/picturemhs2/guide.html">📖 คู่มือ</a>
</p>

</div>
