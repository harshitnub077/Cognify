import prisma from './src/lib/prisma';
async function main() {
  console.time('query1');
  await prisma.achievement.findMany({ take: 5 });
  console.timeEnd('query1');

  console.time('query2');
  await prisma.contentLog.findMany({ take: 5 });
  console.timeEnd('query2');
}
main().catch(console.error).finally(() => prisma.$disconnect());
