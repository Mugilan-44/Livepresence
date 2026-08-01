# Prolync LivePresence – Enterprise People Operations & Management Portal

> **Company**: Prolync Infotech Pvt. Ltd.  
> **Product**: Prolync LivePresence  
> **Version**: 1.0.0  

Prolync LivePresence is a clean, modern, enterprise-grade People Operations & Management Portal designed for seamless employee onboarding, geofenced attendance tracking, simplified leave management, interactive timesheets, project allocations, document verification, and automated email notifications.

---

## 🌟 Key Features

### 1. 🏢 Employee Management & Onboarding
- **Passwordless Onboarding**: Admin adds employee $\rightarrow$ system dispatches an activation invitation email with an OTP link $\rightarrow$ employee sets password and logs in.
- **Strict Input Validation**: Enforces 10-digit phone numbers (`0-9`) and valid work email addresses (`@`).
- **Cards View Default**: Employee Directory defaults to an intuitive Cards Grid with profile completeness tracking.

### 2. 📍 Attendance & GPS Geofencing
- **Zero-Proxy Check-In**: Verifies GPS proximity within 100m of Prolync HQ (Vandalur, TN).
- **Auto-Checkout**: 10-hour automatic shift checkout safeguard.
- **Regularization & WFH**: Attendance regularization and WFH request approval workflows.

### 3. 🌴 Leave Management Module
- **Yearly Balances**: Casual (12), Sick (10), Earned (15), Comp Off (2).
- **Admin Overrides**: Inline balance adjustment (`+/-`) with medical document attachments (< 1 MB).
- **Auto Deduction & Restoration**: Automatic leave balance deduction upon approval and restoration upon cancellation.
- **Holidays CRUD**: National, festival, and company holiday management.

### 4. 💬 Timesheet Chat & Standup Feed
- **Streamlined Work Logs**: Single text update box replacing complex multi-field forms.
- **Auto Check-In Intake**: Automatically attaches check-in timestamps and shift duration to posts.
- **Live Team Stream**: Real-time team standup updates with interactive acknowledgment reactions.

### 5. 💼 Projects & Multi-Employee Allocation
- **Multi-Employee Assignment**: Assign 2 or more employees to any project with multi-select checkboxes.
- **Task Velocity & Kanban**: Drag-and-drop Kanban workflow with task status tracking.

### 6. 📄 Document Vault & HR Verification Queue
- **1 MB File Size Limit**: Enforces a strict 1 MB file upload cap to prevent storage bloat.
- **AES-256 Encryption**: Encrypted document vault with HR approval/rejection feedback queue.
- **Onboarding Banner**: Global percentage complete progress banner (`% Complete`) on every page.

### 7. ✉️ Email Engine & Live SMTP Delivery
- **Official Branding**: Header with Prolync logo (via Content-ID inline attachment `cid:prolync_logo`), **Prolync LivePresence** branding, and closing signature:
  ```text
  Regards,

  Prolync Team
  Prolync LivePresence
  ```
- **Zero "HRMS" References**: Standardized professional wording across all 21 templates.

---

## 🚀 Tech Stack

- **Frontend**: React (Vite), Vanilla CSS design tokens, Lucide React icons.
- **Backend**: Node.js, Express.js (Modular Routers: `auth`, `employees`, `leaves`, `attendance`, `projects`, `payroll`, `documents`, `admin`).
- **Persistence**: Hybrid File DB (`server/data.json`) + MySQL (`server/schema.sql`).
- **Email**: Nodemailer with SMTP & CID inline MIME attachments.

---

## 🛠️ Quick Start

```bash
# 1. Install Client Dependencies
cd client
npm install

# 2. Install Server Dependencies
cd ../server
npm install

# 3. Start Backend Server (Port 5000)
npm run dev

# 4. Start Frontend Client (Port 3000)
cd ../client
npm run dev
```

---

## 📄 License
© 2026 Prolync Infotech Pvt. Ltd. All rights reserved.
