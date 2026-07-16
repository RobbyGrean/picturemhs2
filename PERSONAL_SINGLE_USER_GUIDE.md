# คู่มือทำ PICMHS2 สำหรับใช้ส่วนตัวคนเดียว

คู่มือนี้ใช้สำหรับระบบที่มีบัญชี Google เพียงหนึ่งบัญชีเป็นเจ้าของและผู้ใช้งาน ระบบจึงทำงานเป็น `Admin Hub` โดยเจ้าของคนเดียวสามารถอัปโหลด ค้นหา แก้ไข/ย้าย archive/restore และดูแล Drive/Sheet ได้ทั้งหมด

การใช้คนเดียวไม่จำเป็นต้องลบ authorization ออกจากโค้ด การคงระบบตรวจ token และ Admin ไว้ช่วยป้องกัน endpoint และทำให้เพิ่มผู้ใช้ภายหลังได้ง่าย

## 1. เลือกรูปแบบก่อนเริ่ม

### แบบ A — ส่วนตัวจริง ไม่เผยแพร่

- Admin คนเดียว
- Drive root เป็น Private
- ทุกกิจกรรมใช้ `visibility = internal`
- ซ่อนหรือปิดลิงก์ Public Search
- Public endpoint ต้องไม่คืน metadata ของกิจกรรมส่วนตัว

### แบบ B — เจ้าของคนเดียว แต่แจกภาพสาธารณะ

- Admin คนเดียวเป็นผู้อัปโหลด
- คง Public Search
- กิจกรรมที่จะเผยแพร่ใช้ `visibility = public`
- Drive folder ที่เผยแพร่ต้องเปิด `Anyone with the link — Viewer`

หากมีทั้งไฟล์ส่วนตัวและไฟล์แจกสาธารณะ แนะนำแยก Drive root ไม่ใช้ root สาธารณะเดียวกัน

## 2. ข้อมูลที่ต้องเตรียม

```text
ชื่อระบบส่วนตัว: ________________________________
Google account: _________________________________
GitHub username: ________________________________
ชื่อ repository: ________________________________
รูปแบบ: PRIVATE_ONLY / PUBLIC_SHARING
Drive root ID: __________________________________
Spreadsheet ID: _________________________________
OAuth Client ID: ________________________________
Apps Script /exec URL: __________________________
```

## 3. Google Drive

1. Login ด้วยบัญชี Google ที่จะเป็นเจ้าของระบบ
2. สร้าง Drive root ใหม่
3. คัดลอก Folder ID
4. ไม่ต้องเพิ่ม Editor คนอื่น

สิทธิ์ตามรูปแบบ:

| รูปแบบ | Drive permission |
|---|---|
| `PRIVATE_ONLY` | Restricted เฉพาะบัญชีเจ้าของ |
| `PUBLIC_SHARING` | เฉพาะโฟลเดอร์ที่เผยแพร่เป็น Anyone with the link — Viewer |

## 4. Google Sheets

สร้าง Spreadsheet ใหม่หนึ่งไฟล์สำหรับ:

```text
uploads
allowed_users
activity_audit
```

เจ้าของคนเดียวไม่จำเป็นต้องมี uploader row ใน `allowed_users` เพราะ backend อนุญาต Admin จาก `CONFIG.ADMIN_EMAILS` โดยตรง แต่คงชีตไว้ได้โดยไม่มีภาระอย่างมีนัยสำคัญ

## 5. Google Cloud และ OAuth

1. สร้าง Google Cloud project ใหม่
2. เปิด Google Drive API
3. สร้าง OAuth consent screen
4. ถ้าใช้ Gmail ทั่วไป ให้ใช้ External + Testing และเพิ่มอีเมลตัวเองเป็น Test user
5. เพิ่ม scope:

```text
https://www.googleapis.com/auth/drive.file
```

6. สร้าง OAuth Client ID แบบ Web application
7. เพิ่ม Authorized JavaScript origin:

```text
http://127.0.0.1:5500
https://YOUR-GITHUB-USERNAME.github.io
```

## 6. Apps Script backend

แก้ `CONFIG`:

```javascript
const CONFIG = {
  ROOT_FOLDER_ID: "YOUR_PERSONAL_DRIVE_ROOT_ID",
  METADATA_SHEET_ID: "YOUR_PERSONAL_SPREADSHEET_ID",
  SHEET_UPLOADS: "uploads",
  SHEET_ALLOWED_USERS: "allowed_users",
  SHEET_ACTIVITY_AUDIT: "activity_audit",
  TIME_ZONE: "Asia/Bangkok",
  CATEGORIES: ["กิจกรรมและอื่นๆ", "ท่องเที่ยว", "ครอบครัว"],
  ADMIN_EMAILS: ["your-email@gmail.com"]
};
```

ไม่ต้องใส่อีเมลสำรองเป็นค่าว่างลวง ให้ใช้ array หนึ่งรายการ

ตรวจการสร้าง Owner row:

```javascript
sheet.appendRow([
  CONFIG.ADMIN_EMAILS[0],
  "Owner Admin",
  true,
  "personal owner"
]);
```

ห้ามมีอีเมลของเจ้าของระบบเดิม hardcode อยู่ในฟังก์ชัน

ใน Apps Script → Project Settings → Script Properties:

```text
GOOGLE_CLIENT_ID = OAuth Client ID ของคุณ
```

จากนั้นรัน:

```javascript
setupActivityManagement()
```

แล้ว Deploy เป็น Web app:

- Execute as: Me
- ตั้ง access ให้ตรงกับการเรียก Public Search
- คัดลอก URL `/exec`

## 7. Frontend

ใน `assets/js/app.js`:

```javascript
APPS_SCRIPT_URL: "YOUR_APPS_SCRIPT_EXEC_URL",
GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID",
CATEGORIES: ["กิจกรรมและอื่นๆ", "ท่องเที่ยว", "ครอบครัว"],
ACTIVITY_PRESETS: ["ท่องเที่ยว", "วันเกิด", "งานครอบครัว"]
```

ใน `public/index.html`:

```javascript
API_URL: "YOUR_APPS_SCRIPT_EXEC_URL",
CATEGORIES: ["กิจกรรมและอื่นๆ", "ท่องเที่ยว", "ครอบครัว"]
```

หมวดต้องตรงกับ `Code.gs` ทุกตัวอักษร และควรปรับ `CATEGORY_COVER_FILES`/SVG ให้ตรงกับหมวดใหม่

## 8. ปรับสำหรับ Private-only

หากเลือก `PRIVATE_ONLY` ให้ทำทั้งหมดนี้:

1. Drive root เป็น Restricted
2. เปลี่ยนค่าเริ่มต้นกิจกรรมใหม่จาก `public` เป็น `internal`
3. ตรวจ `resetNewUpload()` และ select `visibility` ไม่ให้กลับไปเป็น `public`
4. ซ่อนลิงก์ Public Search จากหน้า landing/header/guide
5. ไม่ประชาสัมพันธ์ URL `/public/`
6. ตรวจว่า `publicLatest` และ `publicSearch` ไม่คืนกิจกรรม internal
7. ถ้าไม่ต้องการ public endpoint เลย ให้ปิด route ใน backend หรือให้ตอบข้อมูลว่าง โดยยังคง health check แยกต่างหาก

อย่าใช้เพียงการทำ Drive เป็น Private เพราะ Public Search อาจยังแสดงชื่อกิจกรรมและ metadata แม้ผู้ชมเปิดไฟล์ไม่ได้

## 9. ปรับสำหรับ Public sharing

หากเลือก `PUBLIC_SHARING`:

1. คงหน้า `/public/`
2. กิจกรรมทั่วไปเริ่มเป็น `public` ได้
3. เปิด Viewer เฉพาะ Drive folder/root ที่ตั้งใจแจก
4. ทดลองเปิด Public Search และ Drive ด้วย Incognito
5. กิจกรรมส่วนตัวต้องเป็น `internal` และไม่ควรอยู่ใต้ root ที่แชร์สาธารณะ

## 10. สิ่งที่ตัดออกได้และสิ่งที่ควรเก็บ

### ตัดหรือซ่อนได้

- หน้า/แท็บจัดการ uploader
- ปุ่มเพิ่มผู้ใช้
- Backup Admin
- คู่มือส่วนการบริหารทีม

### ควรเก็บไว้

- Google ID token verification
- `CONFIG.ADMIN_EMAILS`
- authorization ของ protected actions
- activity audit
- move/rollback
- visibility
- soft delete/restore
- `allowed_users` schema เผื่อเพิ่มคนในอนาคต

การซ่อน Admin user management เป็นการลด UI ไม่ใช่เหตุผลให้ลบ authorization backend

## 11. Branding ส่วนตัว

ค้นหาและเปลี่ยนคำว่า `PICMHS2`, ชื่อหน่วยงาน และ URL เดิมใน:

```text
index.html
public/index.html
guide.html
README.md
assets/js/app.js
assets/covers/*.svg
```

ตัวอย่างชื่อ:

```text
My Picture Hub
Family Photo Archive
Personal Activity Drive
```

## 12. Test checklist

### Authentication

- [ ] Login ได้เฉพาะ Google account เจ้าของ
- [ ] Client ID ที่ไม่ตรงถูกปฏิเสธ
- [ ] protected POST ไม่มี token ถูกปฏิเสธ
- [ ] Admin Hub แสดงเฉพาะหลัง login

### Activity Management

- [ ] อัปโหลดใหม่ได้
- [ ] เพิ่มไฟล์ในกิจกรรมเดิมได้
- [ ] แก้ชื่อ/วันที่/หมวดและย้าย Drive folder ได้
- [ ] folder ID และ URL เดิมไม่เปลี่ยน
- [ ] ทดสอบ failure แล้ว rollback ถูกต้อง
- [ ] archive ไม่ลบไฟล์จริง
- [ ] restore กลับมาค้นหาได้

### Privacy

- [ ] Private-only ไม่คืนชื่อกิจกรรมผ่าน public API
- [ ] Public sharing แสดงเฉพาะ `active + public`
- [ ] internal ไม่แสดงใน Incognito
- [ ] Drive permission ตรงกับ visibility ที่ตั้งใจ

### Regression

- [ ] UI 320px และ desktop
- [ ] Modal ปิดด้วยยกเลิก กากบาท และ Escape
- [ ] SVG cover lazy-load
- [ ] README/Guide ไม่มีอีเมลหรือ URL ของระบบเดิม

## 13. Backup ที่ควรมี

- Export/สำเนา Spreadsheet เป็นระยะ
- Backup Apps Script source ใน private repository
- จด Drive root ID, Sheet ID และ deployment URL ใน password manager/secure note
- ถ้าเป็นข้อมูลสำคัญมาก ควรมีบัญชีกู้คืนหรือ Backup Admin แม้ใช้งานจริงเพียงคนเดียว

---

## Prompt สำหรับสั่ง AI แชทใหม่

คัดลอก Prompt นี้ กรอกค่าระหว่าง `<...>` แล้วส่งพร้อม repository/workspace

```text
ช่วยดัดแปลง PICMHS2 เป็นระบบเก็บรูปส่วนตัวสำหรับผู้ใช้หนึ่งคน
โปรดอ่าน PERSONAL_SINGLE_USER_GUIDE.md, README.md, guide.html,
Code.gs, assets/js/app.js, index.html และ public/index.html ให้ครบก่อนแก้ไข

ข้อมูลของฉัน:
- ชื่อระบบ: <SYSTEM_NAME>
- Google account/Admin: <OWNER_EMAIL>
- รูปแบบ: <PRIVATE_ONLY | PUBLIC_SHARING>
- Drive root ID: <DRIVE_ROOT_ID>
- Spreadsheet ID: <SPREADSHEET_ID>
- OAuth Client ID: <GOOGLE_CLIENT_ID>
- Apps Script /exec URL: <APPS_SCRIPT_EXEC_URL>
- GitHub Pages origin: <GITHUB_PAGES_ORIGIN>
- Repository URL: <REPOSITORY_URL>
- หมวดกิจกรรม: <CATEGORY_LIST>
- Activity presets: <ACTIVITY_PRESET_LIST>

งานที่ต้องทำ:
1. ทำให้มีผู้ใช้เพียงหนึ่งคน และกำหนด ADMIN_EMAILS เป็น array หนึ่งรายการ
2. ให้ ensureAllowedUsersHeader ใช้ CONFIG.ADMIN_EMAILS[0] ห้าม hardcode email
3. คง token verification และ authorization ของ protected actions
4. ซ่อน UI จัดการ uploader ที่ไม่จำเป็น แต่ไม่ลดความปลอดภัย backend
5. เปลี่ยน Drive ID, Sheet ID, OAuth Client ID และ Apps Script URL ทั้งหมด
6. ให้ CATEGORIES ตรงกันใน Code.gs, assets/js/app.js และ public/index.html
7. ปรับ CATEGORY_COVER_FILES และ SVG ให้ตรงกับหมวดใหม่
8. เปลี่ยน branding, title, meta description, README และ guide เป็นของฉัน
9. ถ้าเป็น PRIVATE_ONLY:
   - ค่าเริ่มต้น visibility ต้องเป็น internal
   - ซ่อน Public Search link
   - publicSearch/publicLatest ต้องไม่คืนกิจกรรมส่วนตัว
   - ระบุว่าต้องตั้ง Drive เป็น Restricted
10. ถ้าเป็น PUBLIC_SHARING:
   - คงหน้า public
   - แสดงเฉพาะ active + public
   - ระบุโฟลเดอร์ที่ต้องเปิด Anyone with the link — Viewer
11. รัน test authorization, upload, move/rollback, visibility,
    soft delete/restore, public privacy และ frontend regression
12. ห้าม commit token, access token, OAuth client secret หรือข้อมูลระบบเดิม

ก่อนแก้ให้สรุปแผนและไฟล์ที่จะเปลี่ยน หลังแก้ให้รายงานผลทดสอบ,
รายการตั้งค่าที่ต้องทำเองใน Google Cloud/Drive/Apps Script และ diff summary
ห้าม force push และห้าม deploy จนกว่าจะยืนยัน target repository
```
