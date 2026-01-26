import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: "default@fintrack.local" },
      select: { id: true },
    });

    if (!user) {
      return Response.json({ error: "Default user not found" }, { status: 500 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return Response.json({ categories });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
