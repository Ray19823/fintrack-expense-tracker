const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultEmail = "default@fintrack.local";

  const user =
    (await prisma.user.findUnique({ where: { email: defaultEmail } })) ??
    (await prisma.user.create({
      data: { name: "Default User", email: defaultEmail },
    }));

  const categories = [
    { name: "Salary", type: "INCOME" },
    { name: "Bonus", type: "INCOME" },
    { name: "Food", type: "EXPENSE" },
    { name: "Transport", type: "EXPENSE" },
    { name: "Bills", type: "EXPENSE" },
    { name: "Shopping", type: "EXPENSE" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: {
        userId_name_type: { userId: user.id, name: c.name, type: c.type },
      },
      update: {},
      create: { userId: user.id, ...c },
    });
  }

  console.log("✅ Seeded default user + categories");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
