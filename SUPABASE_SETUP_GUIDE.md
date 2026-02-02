# IT Helpdesk - Supabase Migration Guide

## ภาพรวมการย้ายระบบ
ระบบ IT Helpdesk ได้รับการปรับปรุงให้ใช้ **Supabase** แทน Google Sheets และ **n8n** สำหรับส่งอีเมลแทน Google Apps Script

---

## ขั้นตอนที่ 1: สร้าง Supabase Project

1. ไปที่ [supabase.com](https://supabase.com) และสมัครบัญชีฟรี
2. สร้าง Project ใหม่
3. เก็บข้อมูลต่อไปนี้:
   - **Project URL** (เช่น `https://xxxxx.supabase.co`)
   - **Anon Key** (จาก Settings > API)

---

## ขั้นตอนที่ 2: รัน SQL Schema

1. ไปที่ **SQL Editor** ใน Supabase Dashboard
2. เปิดไฟล์ `supabase-schema.sql` และ copy เนื้อหาทั้งหมด
3. วางใน SQL Editor แล้วกด **Run**

Schema จะสร้าง:
- ตาราง `tickets` สำหรับเก็บข้อมูลเคส
- ตาราง `users` สำหรับ admin login
- Indexes และ RLS policies

---

## ขั้นตอนที่ 3: ตั้งค่า Supabase Config

แก้ไขไฟล์ `js/supabase-config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL',    // เปลี่ยนเป็น URL ของคุณ
    key: 'YOUR_SUPABASE_ANON_KEY',       // เปลี่ยนเป็น Anon Key ของคุณ
    // ...
};
```

---

## ขั้นตอนที่ 4: ตั้งค่า n8n Workflows

### สำหรับ Evaluation Email:
1. Import ไฟล์ `n8n-workflows/evaluation-email.json` เข้า n8n
2. ตั้งค่า Microsoft Outlook credentials
3. Copy Webhook URL และใส่ใน `supabase-config.js`

### สำหรับ Problem Follow-up Email:
1. Import ไฟล์ `n8n-workflows/problem-followup-email.json` เข้า n8n
2. ตั้งค่า Microsoft Outlook credentials
3. Copy Webhook URL และใส่ใน `supabase-config.js`

---

## ขั้นตอนที่ 5: อัปเดต Webhook URLs

ใน `js/supabase-config.js`:
```javascript
n8nEvaluationWebhookUrl: 'https://192.168.0.88:5678/webhook/evaluation-email',
n8nProblemFollowupWebhookUrl: 'YOUR_N8N_PROBLEM_FOLLOWUP_WEBHOOK_URL',
```

---

## ไฟล์ที่ได้รับการปรับปรุง

| ไฟล์ | สถานะ | หมายเหตุ |
|------|--------|----------|
| `supabase-schema.sql` | ✅ สร้างใหม่ | SQL schema สำหรับ Supabase |
| `js/supabase-config.js` | ✅ สร้างใหม่ | Supabase client configuration |
| `n8n-workflows/evaluation-email.json` | ✅ สร้างใหม่ | n8n workflow template |
| `n8n-workflows/problem-followup-email.json` | ✅ สร้างใหม่ | n8n workflow template |
| `Index.html` | ✅ อัปเดต | ใช้ Supabase API |
| `evaluate.html` | ✅ อัปเดต | ใช้ Supabase API |
| `problem-followup.html` | ✅ อัปเดต | ใช้ Supabase API |
| `dashboard.html` | ⏳ รอดำเนินการ | ต้องการการ migrate เพิ่มเติม |

---

## หมายเหตุ

### เกี่ยวกับ Dashboard.html
ไฟล์ `dashboard.html` มีขนาดใหญ่ (~2400 บรรทัด) และมีการเชื่อมต่อกับ Google Apps Script หลายจุด:
- ระบบ Login/Logout
- การโหลดและ render tickets
- การจัดการ users
- Countdown timers
- Auto email resend

การ migrate ไฟล์นี้ต้องทำอย่างระมัดระวังและต้องการเวลามากกว่าไฟล์อื่น

### Teams Webhook
Teams notification ยังคงใช้ webhook URL เดิม โดยถูกเรียกจาก frontend โดยตรง

### การ Backup
แนะนำให้ backup ไฟล์ต้นฉบับก่อนทำการเปลี่ยนแปลง

---

## การ Deploy

1. ตรวจสอบว่า config ทุกอย่างถูกตั้งค่าแล้ว
2. Push code ไปยัง GitHub repository
3. GitHub Pages จะ deploy อัตโนมัติ

---

## การ Test

1. ทดสอบ Submit Ticket (Index.html)
2. ทดสอบ Evaluation Form (evaluate.html?caseId=XXX)
3. ทดสอบ Problem Follow-up (problem-followup.html?caseId=XXX)
4. ตรวจสอบ Supabase dashboard เพื่อดูข้อมูล

---

## ติดต่อ
หากพบปัญหาในการ setup กรุณาตรวจสอบ:
1. Supabase Project URL และ Key ถูกต้อง
2. RLS policies ถูก enable
3. n8n Webhook URLs ถูกตั้งค่า
