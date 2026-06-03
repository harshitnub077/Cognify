import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.time('query');
  const logs = await prisma.contentLog.findMany({ take: 5 });
  console.timeEnd('query');
  console.log('Got', logs.length, 'logs');
}
main().catch(console.error).finally(() => prisma.$disconnect());
