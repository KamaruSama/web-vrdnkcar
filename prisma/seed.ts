import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        name: 'ผู้ดูแลระบบ',
        position: 'ผู้ดูแลระบบ',
        role: 'admin',
        showInRequesterList: 0,
      },
    });
    console.log('✅ สร้างผู้ใช้ admin เรียบร้อยแล้ว');
  } else {
    console.log('✅ มีผู้ใช้ admin อยู่แล้ว');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
