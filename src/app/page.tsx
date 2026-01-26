// src/app/page.tsx

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", lineHeight: 1.6 }}>
      <h1>FinTrack</h1>
      <p>Week 1: Prisma + PostgreSQL + API route is working ✅</p>
      <p>
        Test endpoint: <a href="/api/categories">/api/categories</a>
      </p>
    </main>
  );
}
