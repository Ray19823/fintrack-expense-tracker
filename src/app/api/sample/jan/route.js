import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

function d(isoDate) {
  // isoDate like "2026-01-03"
  // txnDate is @db.Date, but Prisma accepts a JS Date (time ignored for date type)
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function POST() {
  try {
    const user = await requireUser();

    // 1) Ensure global categories exist (unique: [name, type])
    const categories = [
      { name: "Food", type: "EXPENSE" },
      { name: "Transport", type: "EXPENSE" },
      { name: "Bills", type: "EXPENSE" },
      { name: "Salary", type: "INCOME" },
      { name: "Entertainment", type: "EXPENSE" },
      { name: "Shopping", type: "EXPENSE" },
      { name: "Gym", type: "EXPENSE" },
    ];

    const catRows = [];
    for (const c of categories) {
      const row = await prisma.category.upsert({
        where: {
          // compound unique generated from @@unique([name, type])
          name_type: { name: c.name, type: c.type },
        },
        update: {},
        create: { name: c.name, type: c.type },
      });
      catRows.push(row);
    }

    const byKey = new Map(catRows.map((c) => [`${c.name}__${c.type}`, c]));

    // 2) Insert Jan 2026 transactions for THIS user
    // direction must be TxnDirection (my enum). I'll assume "INCOME"/"EXPENSE"
    const janTx = [
      {
        txnDate: "2026-01-02",
        amount: 3200.0,
        direction: "INCOME",
        categoryName: "Salary",
        categoryType: "INCOME",
        description: "Monthly salary",
      },
      {
        txnDate: "2026-01-03",
        amount: 45.0,
        direction: "EXPENSE",
        categoryName: "Food",
        categoryType: "EXPENSE",
        description: "Groceries",
      },
      {
        txnDate: "2026-01-05",
        amount: 18.5,
        direction: "EXPENSE",
        categoryName: "Food",
        categoryType: "EXPENSE",
        description: "Lunch",
      },
      {
        txnDate: "2026-01-08",
        amount: 120.0,
        direction: "EXPENSE",
        categoryName: "Bills",
        categoryType: "EXPENSE",
        description: "Mobile and utilities",
      },
      {
        txnDate: "2026-01-10",
        amount: 22.0,
        direction: "EXPENSE",
        categoryName: "Transport",
        categoryType: "EXPENSE",
        description: "MRT and bus top-up",
      },
      {
        txnDate: "2026-01-12",
        amount: 65.0,
        direction: "EXPENSE",
        categoryName: "Shopping",
        categoryType: "EXPENSE",
        description: "Personal items",
      },
      {
        txnDate: "2026-01-15",
        amount: 60.0,
        direction: "EXPENSE",
        categoryName: "Gym",
        categoryType: "EXPENSE",
        description: "Monthly gym membership",
      },
      {
        txnDate: "2026-01-18",
        amount: 38.0,
        direction: "EXPENSE",
        categoryName: "Entertainment",
        categoryType: "EXPENSE",
        description: "Movie and snacks",
      },
      {
        txnDate: "2026-01-20",
        amount: 42.5,
        direction: "EXPENSE",
        categoryName: "Food",
        categoryType: "EXPENSE",
        description: "Dinner",
      },
      {
        txnDate: "2026-01-24",
        amount: 82.0,
        direction: "EXPENSE",
        categoryName: "Food",
        categoryType: "EXPENSE",
        description: "Weekend meals",
      },
      {
        txnDate: "2026-01-27",
        amount: 55.0,
        direction: "EXPENSE",
        categoryName: "Transport",
        categoryType: "EXPENSE",
        description: "Grab and public transport",
      },
      {
        txnDate: "2026-01-30",
        amount: 92.0,
        direction: "EXPENSE",
        categoryName: "Food",
        categoryType: "EXPENSE",
        description: "Groceries and meals",
      },
    ];

    // Optional: clear previous Jan sample for THIS user to avoid duplicates
    await prisma.transaction.deleteMany({
      where: {
        userId: user.id,
        txnDate: { gte: d("2026-01-01"), lte: d("2026-01-31") },
      },
    });

    await prisma.transaction.createMany({
      data: janTx.map((t) => {
        const cat = byKey.get(`${t.categoryName}__${t.categoryType}`);
        if (!cat)
          throw new Error(
            `Missing category: ${t.categoryName}/${t.categoryType}`,
          );

        return {
          userId: user.id,
          categoryId: cat.id,
          direction: t.direction,
          amount: t.amount, // Prisma Decimal accepts number
          txnDate: d(t.txnDate),
          description: t.description ?? null,
        };
      }),
    });

    return NextResponse.json({ ok: true, inserted: janTx.length });
  } catch (e) {
    console.error("SEED JAN ERROR:", e);
    return NextResponse.json(
      { error: "Seed failed", details: String(e) },
      { status: 500 },
    );
  }
}
