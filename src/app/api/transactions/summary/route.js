// src/app/api/transactions/summary/route.js
import { prisma } from "@/lib/prisma";

/**
 * GET /api/transactions/summary?userEmail=...&direction=EXPENSE&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns category totals for pie chart.
 * - direction defaults to EXPENSE (for spending pie)
 * - from/to are optional date filters (inclusive)
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);

    const userEmail =
      url.searchParams.get("userEmail") ?? "default@fintrack.local";

    const directionRaw = url.searchParams.get("direction") ?? "EXPENSE";
    const direction =
      directionRaw === "INCOME" || directionRaw === "EXPENSE"
        ? directionRaw
        : null;

    if (!direction) {
      return Response.json(
        { error: "direction must be INCOME or EXPENSE" },
        { status: 400 }
      );
    }

    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to"); // YYYY-MM-DD

    // Resolve user (same pattern as your other routes)
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Optional date range (inclusive)
    const txnDateFilter = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return Response.json(
          { error: "from must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      txnDateFilter.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return Response.json(
          { error: "to must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      txnDateFilter.lte = d;
    }

    const where = {
      userId: user.id,
      direction,
      ...(from || to ? { txnDate: txnDateFilter } : {}),
    };

    // Prisma groupBy totals by categoryId
    const rows = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
    });

    // Get category labels (name/type) for those IDs
    const categoryIds = rows.map((r) => r.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, userId: user.id },
      select: { id: true, name: true, type: true },
    });

    const byId = new Map(categories.map((c) => [c.id, c]));

    // Build chart-friendly output
    const items = rows
      .map((r) => {
        const c = byId.get(r.categoryId);
        const total = r._sum.amount; // Prisma Decimal
        return {
          categoryId: r.categoryId,
          categoryName: c?.name ?? "Unknown",
          categoryType: c?.type ?? null,
          total: total ? total.toString() : "0",
        };
      })
      // sort biggest slice first
      .sort((a, b) => Number(b.total) - Number(a.total));

    const grandTotal = items
      .reduce((acc, it) => acc + Number(it.total), 0)
      .toFixed(2);

    return Response.json({
      direction,
      range: { from: from ?? null, to: to ?? null },
      items,
      grandTotal,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
