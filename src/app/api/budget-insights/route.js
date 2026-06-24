import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

function parseMonthStart(value) {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

function nextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export async function GET(req) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);

    const monthStart = parseMonthStart(
      url.searchParams.get("monthStart") ?? "2026-06-01",
    );

    if (!monthStart) {
      return Response.json(
        { error: "monthStart must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const monthEnd = nextMonth(monthStart);

    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        monthStart,
      },
      select: {
        id: true,
        monthStart: true,
        limitAmount: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ category: { name: "asc" } }],
    });

    const rows = await Promise.all(
      budgets.map(async (b) => {
        const actualAgg = await prisma.transaction.aggregate({
          where: {
            userId: user.id,
            categoryId: b.category.id,
            direction: "EXPENSE",
            txnDate: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const budget = Number(b.limitAmount);
        const actual = Number(actualAgg._sum.amount ?? 0);
        const remaining = budget - actual;
        const usagePct = budget > 0 ? (actual / budget) * 100 : 0;

        return {
          budgetId: b.id,
          categoryId: b.category.id,
          categoryName: b.category.name,
          monthStart: b.monthStart,
          budget: budget.toFixed(2),
          actual: actual.toFixed(2),
          remaining: remaining.toFixed(2),
          usagePct: usagePct.toFixed(1),
          status: usagePct >= 100 ? "OVER" : usagePct >= 80 ? "NEAR" : "OK",
        };
      }),
    );

    return Response.json({
      monthStart: monthStart.toISOString(),
      insights: rows,
    });
  } catch (err) {
    console.error(err);
    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
