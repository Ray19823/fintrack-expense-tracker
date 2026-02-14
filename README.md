💰 FinTrack – Personal Finance Tracking System (Next.js + Prisma + PostgreSQL)

📌 Overview

FinTrack is a fullstack personal finance tracking web application designed to help users manage income, expenses, and financial trends through secure authentication, protected APIs, and real-time analytics dashboards.

This project was developed as part of a Software Engineering Project (SEP) and demonstrates fullstack architecture, RESTful API design, authentication, and data visualisation.

⸻

🚀 Live Features
	•	🔐 User Authentication (Login & Session-based)
	•	📊 Financial Dashboard (Income, Expense, Net Cashflow)
	•	📈 Balance Sheet & Monthly Trends
	•	🧾 Transaction CRUD (Protected Routes)
	•	🗂 Category Management
	•	📉 Historical Trend Analytics
	•	🍪 Secure Session Handling (Cookie-based)
	•	🌐 Deployed on Vercel (Production-ready) 
https://fintrack-expense-tracker-eosin.vercel.app/

⸻

🛠 Tech Stack

Frontend
	•	Next.js (App Router)
	•	React
	•	Chart.js (Data Visualisation)

Backend
	•	Next.js API Routes
	•	Prisma ORM
	•	PostgreSQL Database
	•	Session-based Authentication

DevOps & Tools
	•	Vercel (Deployment)
	•	GitHub (Version Control)
	•	Prisma Migrate & Seed
	•	ESLint + Husky (Code Quality)

⸻

🔐 Authentication Flow
	1.	User logs in via /login
	2.	Server validates credentials
	3.	Session cookie (FinTrack_session) is created
	4.	Protected routes use requireUser() middleware
	5.	Unauthorized users are redirected to login

⸻

📡 Key API Endpoints

Method	Endpoint	Description
POST	/api/auth/login	User login
POST	/api/auth/logout	Destroy session
GET	/api/dashboard/metrics	Financial summary
GET	/api/reports/balance-sheet	Monthly financial report
GET	/api/reports/trends	Historical trends
CRUD	/api/transactions	Protected transaction APIs
GET	/api/categories	Category retrieval

🗄 Database Design

Core Models:
	•	User
	•	Category
	•	Transaction
	•	Session (for authentication)

Managed using Prisma ORM with PostgreSQL.

⸻

⚙️ Installation (Local Setup)

git clone https://github.com/Ray19823/fintrack-expense-tracker.git
cd fintrack-expense-tracker
npm install
npm run dev

Open:
http://localhost:3000

⸻

🧪 Demo Account

Email: default@fintrack.local
Password: 123456

⸻

🌍 Deployment (Vercel)
	1.	Import project into Vercel
	2.	Add DATABASE_URL environment variable
	3.	Run Prisma migrate & seed
	4.	Deploy production build

⸻

🎓 Academic Context

This project was developed for a Fullstack Development Software Engineering Project, focusing on:
	•	Secure API architecture
	•	Backend analytics
	•	Fullstack integration
	•	Real-world SaaS authentication flow

⸻

👨‍💻 Author

Ang Ming Teck
