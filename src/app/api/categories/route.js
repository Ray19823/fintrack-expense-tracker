import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireUser();

    const categories = await prisma.category.findMany({
      select: { id: true, name: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return Response.json({ categories });
  } catch (err) {
    console.error(err);
    if (err?.status === 401)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await requireUser();

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const type = body.type;

    if (!name) {
      return Response.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      return Response.json(
        { error: "type must be INCOME or EXPENSE" },
        { status: 400 },
      );
    }

    const category = await prisma.category.create({
      data: { name, type },
      select: { id: true, name: true, type: true },
    });

    return Response.json({ category }, { status: 201 });
  } catch (err) {
    console.error(err);

    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prisma duplicate unique constraint on @@unique([name, type])
    if (err?.code === "P2002") {
      return Response.json(
        { error: "Category already exists for this type" },
        { status: 409 },
      );
    }

    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await requireUser();

    const body = await req.json().catch(() => ({}));
    const categoryId = String(body.categoryId ?? "").trim();

    if (!categoryId) {
      return Response.json(
        { error: "categoryId is required" },
        { status: 400 },
      );
    }

    // Prevent deleting categories already used by transactions
    const usedCount = await prisma.transaction.count({
      where: { categoryId },
    });

    if (usedCount > 0) {
      return Response.json(
        {
          error:
            "Cannot delete category because it is used by existing transactions",
        },
        { status: 409 },
      );
    }

    const deleted = await prisma.category.deleteMany({
      where: { id: categoryId },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    return Response.json({ success: true, deletedCount: deleted.count });
  } catch (err) {
    console.error(err);

    if (err?.status === 401) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
