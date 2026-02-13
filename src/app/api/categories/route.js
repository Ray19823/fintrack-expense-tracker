import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

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
