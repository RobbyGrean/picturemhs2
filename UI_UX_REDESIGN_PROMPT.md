# Prompt ส่งต่องาน: PICMHS2 Full UI/UX Redesign

คัดลอกข้อความตั้งแต่หัวข้อ “Prompt” ไปใช้กับ coding agent ที่จะทำ redesign รอบถัดไป

---

## Prompt

คุณกำลังปรับปรุง UI/UX ของโครงการ PICMHS2 ใน repository `RobbyGrean/picturemhs2`

### เป้าหมาย

ทำ full redesign ให้ครบทุก page, section, component และ state โดยต่อยอด visual direction ที่เริ่มไว้ใน uploader landing page ปัจจุบัน: modern institutional, สะอาด, สุภาพ, ใช้งานจริงในองค์กร, สีเขียวอมฟ้า, surface สีขาว, organic background, typography ภาษาไทยชัดเจน และใช้ Noto Sans Thai

งานนี้เป็น **presentation-layer redesign** ห้ามเปลี่ยน business logic, API contract, authentication boundary, permission model, Drive sharing หรือ metadata schema

### Source of truth ที่ต้องอ่านเต็มไฟล์ก่อนแก้

1. `README.md` — product, user guide, architecture, setup และ system boundaries
2. `index.html` — uploader frontend และ flow ที่ใช้งานจริง
3. `public/index.html` — public no-auth search
4. `guide.html` — user guide page
5. `starter/Code.gs` — backend contract template; อ่านเพื่อเข้าใจเท่านั้น ห้ามเปลี่ยนในงาน redesign

### Functional baseline ที่ต้องรักษา

- Google Sign-In ของ uploader
- Drive OAuth scope และ direct upload
- Apps Script `init`, `createFolder`, `saveMetadata`, `appendMetadata`
- authenticated `search` และ `getYears`
- anonymous GET `publicSearch`
- public response ไม่มี uploader name/email
- write actions ทั้งหมดยังต้องมี valid ID token
- manual Drive changes ไม่ได้รับการ sync หรือรับประกันโดยระบบ
- static hosting บน GitHub Pages และ Apps Script URL เดิม

ก่อนแก้ ให้รันหรือบันทึก baseline ของทุก flow ที่ทดสอบได้ หลังแก้ต้องผ่านกรณีเดิมทั้งหมด ห้ามแก้ function เพื่อให้ดีไซน์ทำงานง่ายขึ้น

### Design direction

- Primary: deep teal/green (`#0b735f` ใกล้เคียงได้)
- Text: dark green-charcoal
- Background: very light mint/neutral
- Accent ใช้อย่างจำกัดและมี contrast ผ่าน WCAG AA
- Card radius ปานกลาง ไม่ทำทุกอย่างเป็น pill
- Shadow เบา ใช้เฉพาะสร้างลำดับชั้น
- มี whitespace ชัดเจนและลด visual noise
- ใช้ Noto Sans Thai และจัด line-height ให้ภาษาไทยอ่านง่าย
- motion สั้น สุภาพ และรองรับ `prefers-reduced-motion`
- mobile-first ตั้งแต่ 320px และรองรับ desktop อย่างสมบูรณ์
- หลีกเลี่ยง gradient/decoration มากเกินไปจนเหมือน template marketing ทั่วไป
- ภาษาบน UI ต้องเป็นไทยธรรมชาติ กระชับ และ consistent

### Information architecture และหน้าที่ต้องออกแบบครบ

#### 1. Uploader landing page (`index.html` ก่อน login)

- Sticky/responsive navigation
- Brand
- Hero และ value proposition
- Login card พร้อม Google button
- Feature section
- How it works section
- Security/permission explanation
- CTA section
- Entry points ไป Public Search และ User Guide
- Footer
- Login loading/error state

#### 2. Uploader application shell (`index.html` หลัง login)

- Topbar, user identity และ logout
- Page header/context
- Navigation/tabs ที่เห็น active state ชัดเจน
- Responsive layout สำหรับ mobile/tablet/desktop

#### 3. New upload page/section

- Category/date/activity fields
- Preset + custom activity name
- File picker/dropzone
- File list, file size และ remove action
- Disabled/ready/uploading/success/error states
- Progress overlay ที่อ่านได้ด้วย screen reader
- Clear form confirmation เมื่อมีไฟล์ที่เลือกแล้ว
- Helpful manual-upload policy notice

#### 4. Authenticated search page/section

- Filter layout
- Search button และ keyboard submit
- Loading, empty, no-result, error และ result states
- Result card แสดงข้อมูลเดิมครบ
- Open Drive action
- Select activity for append action
- อย่าเปิดเผยข้อมูลมากกว่าที่ API เดิมส่งให้ uploader

#### 5. Append upload page/section

- Selected activity summary
- Empty state ก่อนเลือกกิจกรรม
- File picker/list
- Upload button states
- Success/error feedback
- Clear/reset behavior

#### 6. Public Search (`public/index.html`)

- Brand/header
- Link กลับ User Guide และ uploader
- Filter form: year, month, day, category, activity name
- Initial guidance, loading, empty, no-result, error และ results found
- Truncated-results notice
- Result cards และ “เปิดโฟลเดอร์รูป”
- Folder unavailable state
- Public/privacy notice
- ห้ามเพิ่ม Google Sign-In, OAuth, token storage หรือ write control

#### 7. User Guide (`guide.html`)

- Responsive header/navigation
- Hero/introduction
- Sticky table of contents บน desktop
- Public search guide
- Login guide
- New activity guide
- Append upload guide
- Manual upload policy
- Troubleshooting
- CTA ไป uploader/public search
- รองรับ deep links ผ่าน section IDs

#### 8. Admin user management (`index.html` หลัง login เฉพาะ admin)

- แท็บจัดการ uploader แสดงเฉพาะเมื่อ `init.role = admin`
- ฟอร์ม email, display name และ notes
- รายชื่อ Admin/Uploader/Inactive
- Edit, activate และ deactivate states
- Admin row ต้องไม่สามารถปิดสิทธิ์ได้
- Uploader ต้องไม่เห็นแท็บ และ backend authorization ต้องยังปฏิเสธ API โดยตรง

### Component system

สร้าง design tokens ใน CSS variables และใช้ซ้ำอย่างสม่ำเสมอ:

- colors
- typography scale
- spacing scale
- borders/radii
- shadows
- focus ring
- success/warning/error/info colors

กำหนด component states ให้ครบ:

- Buttons: primary, secondary, ghost/link, destructive เมื่อจำเป็น, disabled, loading, focus, hover
- Inputs/selects: default, focus, invalid, disabled
- Status banners: info, success, warning, error
- Cards: standard, selected, unavailable
- Tabs: active/inactive/focus
- File items: normal/uploading/failed/completed

ไม่ต้องสร้าง framework หรือ build pipeline ใหม่ ระบบต้องยังเป็น static HTML/CSS/JavaScript เปิดบน GitHub Pages ได้โดยตรง

### Accessibility requirements

- Semantic landmarks และ heading order ถูกต้อง
- ทุก input มี `<label>`
- keyboard ใช้งานได้ครบ
- focus indicator มองเห็นชัด
- status ใช้ `aria-live` อย่างเหมาะสม
- modal/overlay ไม่ทำให้ focus หาย
- color contrast อย่างน้อย WCAG AA
- touch target ประมาณ 44px ขึ้นไป
- ไม่ใช้สีเพียงอย่างเดียวสื่อสถานะ
- รองรับ zoom 200% และ viewport 320px

### Security and privacy constraints

- ห้ามลบหรือย้าย `requireIdentity()` ออกจาก protected routes
- ห้ามทำ POST action เป็น public
- ห้ามใส่ uploader email/name ใน public UI
- ห้ามใส่ ID token/access token ใน URL, log หรือ DOM
- ห้ามเปลี่ยน Drive sharing ผ่าน UI
- ห้ามสร้าง client-side admin capability
- external link ใช้ `rel="noopener noreferrer"`
- user/API text ที่ render ต้องใช้ safe DOM APIs หรือ escaping เดิม

### Working method

1. อ่าน source-of-truth ทุกไฟล์เต็มไฟล์
2. ทำ inventory ของ page/section/component/state ปัจจุบัน
3. บันทึก functional baseline
4. เสนอ design tokens และ page map แบบกระชับ
5. ปรับทีละหน้า โดยรักษา DOM IDs และ event wiring ที่ JavaScript ใช้อยู่
6. หลังแต่ละหน้า รัน smoke test และ responsive check
7. ตรวจ diff ว่าไม่มี API/auth/business-logic change
8. ทดสอบ published GitHub Pages ไม่ใช่เฉพาะ local file

### Deliverables

- `index.html` redesign ครบ landing + authenticated app
- `public/index.html` redesign ครบ
- `guide.html` redesign ครบ
- สรุป design tokens/component rules ใน `README.md` หรือเอกสารสั้นแยกไฟล์
- ผล regression test แยก desktop/mobile/public/authenticated
- รายการ known limitations
- file/line references ของการเปลี่ยนสำคัญ

### Eval set — ต้องผ่านก่อนส่งงาน

ให้รายงาน PASS/FAIL พร้อมหลักฐานอย่างน้อย 15 กรณี:

1. Landing page แสดงครบที่ 320px โดยไม่มี horizontal scroll
2. Landing navigation ใช้ keyboard ได้
3. Google Sign-In container และ callback wiring เดิมยังอยู่
4. Login error แสดงด้วย `aria-live`
5. New upload form เปิด/ปิดปุ่มตาม validation เดิม
6. เลือกหลายไฟล์ ลบไฟล์ และแสดงขนาดได้
7. Upload progress ไม่บดบังการอ่านด้วย screen reader อย่างถาวร
8. Authenticated search กด Enter เพื่อค้นหาได้
9. Empty/no-result/error states แตกต่างกันชัดเจน
10. เลือกผลค้นหาแล้ว append target แสดงถูกต้อง
11. Public Search ไม่มี Google Identity script หรือ token storage
12. Public Search ค้นหาและเปิด Drive ได้
13. Public result ไม่มี uploader identity
14. Guide deep links และ sticky TOC ใช้งานได้
15. ทุกหน้าผ่าน keyboard focus และ contrast review
16. protected GET/POST ไม่มี token แล้วยังถูกปฏิเสธ
17. published root, `/public/` และ `/guide.html` ตอบ HTTP 200
18. ไม่มีการเปลี่ยน Apps Script URL, OAuth scope หรือ API action names โดยไม่ตั้งใจ

หาก redesign ขัดกับ functional baseline ให้รักษา function ก่อนและลด scope visual ห้ามแก้ backend เพื่อหลบปัญหา UI

---

## เกณฑ์ประเมิน prompt นี้

ก่อนใช้จริง ให้ตรวจว่าผลลัพธ์ของ agent ผ่าน eval set ด้านบนครบ โดยเฉพาะกรณี 3, 11, 13, 16 และ 18 ซึ่งเป็น security/no-regression gate ห้ามอนุมัติงานจากความสวยเพียงอย่างเดียว
