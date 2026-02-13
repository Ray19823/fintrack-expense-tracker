import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// GET /api/transactions?take=20&cursor=<txnId>
export async function GET(request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);

    const takeRaw = url.searchParams.get("take");
    const cursor = url.searchParams.get("cursor"); //transactionId cursor

    const take = Math.min(
      100,
      Math.max(1, Number.parseInt(takeRaw ?? "20", 10)),
    );

    // Fetch take + 1 to knnow if there is a next page
    const rows = await prisma.transaction.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        createdAt: true,
        category: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ txnDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // skip the cursor row itself
          }
        : {}),
    });

    const hasNextPage = rows.length > take;
    const transactions = hasNextPage ? rows.slice(0, take) : rows;

    const nextCursor = hasNextPage
      ? (transactions[transactions.length - 1]?.id ?? null)
      : null;

    return Response.json({
      transactions,
      pageInfo: { take, nextCursor, hasNextPage },
    });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const { categoryId, direction, amount, txnDate, description } = body ?? {};

    // ---- Basic validation ----
    if (!categoryId || typeof categoryId !== "string") {
      return Response.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    if (direction !== "INCOME" && direction !== "EXPENSE") {
      return Response.json(
        { error: "direction must be INCOME or EXPENSE" },
        { status: 400 },
      );
    }

    const parsedAmount =
      typeof amount === "number" ? amount : Number.parseFloat(String(amount));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 },
      );
    }

    // txnDate: expect "YYYY-MM-DD"
    if (!txnDate || typeof txnDate !== "string") {
      return Response.json(
        { error: "txnDate is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const dateObj = new Date(`${txnDate}T00:00:00.000Z`);
    if (Number.isNaN(dateObj.getTime())) {
      return Response.json(
        { error: "txnDate must be a valid date string (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    // ---- Ensure category exists ----
    const category = await prisma.category.findFirst({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    // ---- Create transaction ----
    const created = await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        direction,
        amount: parsedAmount.toFixed(2), // Prisma Decimal accepts string
        txnDate: dateObj,
        description:
          typeof description === "string" && description.trim()
            ? description.trim()
            : null,
      },
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        createdAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return Response.json({ transaction: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/transactions
export async function PUT(req) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      transactionId,
      categoryId,
      direction,
      amount,
      txnDate,
      description,
    } = body ?? {};

    if (!transactionId) {
      return Response.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    // Ensure the transaction belongs to this user
    const existing = await prisma.transaction.findFirst({
      where: { id: transactionId, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Build update object (only update fields that were provided)
    const data = {};

    if (categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!cat) {
        return Response.json({ error: "Category not found" }, { status: 404 });
      }

      data.categoryId = cat.id;
    }

    if (direction) {
      if (direction !== "INCOME" && direction !== "EXPENSE") {
        return Response.json(
          { error: "direction must be INCOME or EXPENSE" },
          { status: 400 },
        );
      }
      data.direction = direction;
    }

    if (amount !== undefined && amount !== null) {
      const num = typeof amount === "string" ? Number(amount) : amount;
      if (!Number.isFinite(num) || num <= 0) {
        return Response.json(
          { error: "amount must be a positive number" },
          { status: 400 },
        );
      }
      data.amount = num.toFixed(2);
    }

    if (txnDate) {
      const d = new Date(txnDate);
      if (Number.isNaN(d.getTime())) {
        return Response.json(
          { error: "txnDate must be a valid date" },
          { status: 400 },
        );
      }
      data.txnDate = d;
    }

    if (description !== undefined) {
      data.description = description === "" ? null : description;
    }

    // Nothing to update?
    if (Object.keys(data).length === 0) {
      return Response.json(
        { error: "No fields provided to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data,
      select: {
        id: true,
        direction: true,
        amount: true,
        txnDate: true,
        description: true,
        updatedAt: true,
        category: { select: { id: true, name: true, type: true } },
      },
    });

    return Response.json({ transaction: updated });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/transactions
export async function DELETE(req) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { transactionId } = body ?? {};

    if (!transactionId) {
      return Response.json(
        { error: "transactionId is required" },
        { status: 400 },
      );
    }

    // Only delete if it belongs to the user
    const deleted = await prisma.transaction.deleteMany({
      where: { id: transactionId, userId: user.id },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    }

    return Response.json({ success: true, deletedCount: deleted.count });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
