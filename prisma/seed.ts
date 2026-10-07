import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@insightpoll.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin#2026!';

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`\n🎉 Seed user berhasil!`);
  console.log(`Email    : ${user.email}`);
  console.log(`Password : ${adminPassword}\n`);
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
