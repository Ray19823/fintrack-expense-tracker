# 💰 FinTrack – Fullstack Expense Tracker (Next.js + Prisma + PostgreSQL)

FinTrack is a fullstack personal finance web application that allows users to securely track income and expenses, visualize financial data, and analyze balance sheets and historical trends through an interactive dashboard.

This project was built as a fullstack application demonstrating authentication, protected APIs, database integration, and data analytics visualization.

---

## 🚀 Live Demo
https://fintrack-expense-tracker-eosin.vercel.app/

https://your-vercel-url.vercel.app

### Demo Credentials
Email: `default@fintrack.local`  
Password: `123456`

---

## 🧠 Problem Statement
Many individuals lack a simple and secure way to track their personal finances and analyze spending trends over time.  
Most expense trackers either lack data visualization, authentication security, or meaningful financial insights such as balance sheets and historical trends.

FinTrack solves this by providing:
- Secure user authentication
- Protected financial data (session-based)
- Real-time dashboard metrics
- Balance sheet reporting
- Monthly historical trend analysis

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- User login (email + password)
- Session-based authentication
- Protected API routes using middleware logic (`requireUser()`)
- Secure logout (session deletion + cookie clearing)

### 📊 Dashboard Analytics
- Total Income
- Total Expense
- Net Cashflow
- Transaction Count
- Category Breakdown Pie Chart

### 📈 Financial Reports
- Balance Sheet (Income vs Expense vs Net)
- Monthly Historical Trends (grouped by month)
- Zero-fill monthly data for accurate charts

### 🧾 Transaction Management (CRUD)
- Create transactions (income & expense)
- Read transaction records
- Update transactions
- Delete transactions
- Protected routes (requires valid session)

### 🗂 Category System
- Income & Expense categories
- Global category aggregation API
- Sorted and optimized Prisma queries

---

## 🏗 Tech Stack

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- Chart.js / Recharts (for analytics visualization)

### Backend
- Next.js API Routes (Fullstack architecture)
- Prisma ORM
- PostgreSQL Database
- Session-based Authentication (HTTP cookies)

### DevOps & Deployment
- Vercel (Hosting)
- Neon / PostgreSQL (Production Database)
- GitHub (Version Control)

---

## 🗄 Database Design (Core Entities)
- User
- Session
- Transaction
- Category

Relationships:
- One User → Many Transactions
- One Category → Many Transactions
- One User → Many Sessions

---

## ⚙️ Local Development Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/Ray19823/fintrack-expense-tracker.git
cd fintrack-expense-tracker

2️⃣ Install Dependencies

npm install

3️⃣ Configure Environment Variables

Create a .env file:

DATABASE_URL="your_postgresql_connection_string"

4️⃣ Run Prisma Migrations

npx prisma migrate dev

5️⃣ Seed Demo Data

node prisma/seed.js

6️⃣ Start Development Server

npm run dev

Open:
http://localhost:3000

🔐 Authentication Flow (Architecture)

Proper SaaS auth flow implemented:
	1.	Register / Login
	2.	Session creation (stored in DB + cookie)
	3.	Protected API routes using requireUser()
	4.	Logout (destroy session + clear cookie)
	5.	Secure access to dashboard, CRUD, and reports


📡 API Endpoints (Core)

Auth
	•	POST /api/auth/login – Login user
	•	POST /api/auth/logout – Logout & destroy session

Dashboard
	•	GET /api/dashboard/metrics – Dashboard summary metrics

Transactions
	•	GET /api/transactions
	•	POST /api/transactions
	•	PUT /api/transactions
	•	DELETE /api/transactions

Reports
	•	GET /api/reports/balance-sheet – Financial summary
	•	GET /api/reports/trends – Monthly historical trends

Categories
	•	GET /api/categories – Fetch global categories

(All protected via session validation middleware)

⸻

🔒 Security Considerations
	•	Session-based authentication
	•	Protected CRUD routes
	•	Server-side user validation via Prisma
	•	HTTP-only cookies for session security
	•	No client-side sensitive data exposure

⸻

☁️ Deployment (Vercel)

Steps:
	1.	Push repository to GitHub
	2.	Import project into Vercel
	3.	Add environment variable:
	•	DATABASE_URL
	4.	Deploy
	5.	Run production migration:

npx prisma migrate deploy
node prisma/seed.js

🖥 UI Screens Implemented
	•	Login Page (/login)
	•	Dashboard Page (/dashboard)
	•	Reports Page (/reports)
	•	Protected Navigation (Logout + Redirect on 401)

⸻

📚 Learning Outcomes

This project demonstrates:
	•	Fullstack application architecture (Next.js)
	•	Authentication & session management
	•	RESTful API design
	•	Prisma ORM with PostgreSQL
	•	Data aggregation & analytics endpoints
	•	Secure route protection middleware
	•	Real-world SaaS backend flow implementation

⸻

👨‍💻 Author

Ray Ang
Diploma in Fullstack Development
Backend & Fullstack Project – FinTrack Expense Tracker

⸻

📜 License

This project is for educational and academic submission purposes.
