import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function parseDateParam(s: string | null) {
  if (!s) return null;
  // Expect YYYY-MM-DD
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const from = parseDateParam(url.searchParams.get("from"));
    const toRaw = parseDateParam(url.searchParams.get("to"));

    // ✅ Session user (auth)
    const user = await requireUser(); // throws { status: 401 } when not logged in

    // ✅ Make "to" inclusive by converting it to < nextDay (same logic style as summary)
    const toExclusive = toRaw
      ? new Date(
          Date.UTC(
            toRaw.getUTCFullYear(),
            toRaw.getUTCMonth(),
            toRaw.getUTCDate() + 1,
          ),
        )
      : null;

    const whereDate =
      from || toExclusive
        ? {
            txnDate: {
              ...(from ? { gte: from } : {}),
              ...(toExclusive ? { lt: toExclusive } : {}),
            },
          }
        : {};

    // Income totals
    const incomeAgg = await prisma.transaction.aggregate({
      where: { userId: user.id, direction: "INCOME", ...whereDate },
      _sum: { amount: true },
      _count: true,
    });

    // Expense totals
    const expenseAgg = await prisma.transaction.aggregate({
      where: { userId: user.id, direction: "EXPENSE", ...whereDate },
      _sum: { amount: true },
      _count: true,
    });

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);
    const netCashflow = income - expense;

    return Response.json({
      range: {
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      },
      metrics: {
        totalIncome: income.toFixed(2),
        totalExpense: expense.toFixed(2),
        netCashflow: netCashflow.toFixed(2),
        txCount: (incomeAgg._count ?? 0) + (expenseAgg._count ?? 0),
      },
    });
  } catch (err: unknown) {
    console.error(err);

    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: number }).status
        : undefined;

    // ✅ Proper 401 instead of “Server error”
    if (status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
