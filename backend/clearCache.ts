import prisma from './src/lib/prisma';

async function main() {
  const result = await prisma.contentLog.deleteMany({});
  console.log('Deleted ' + result.count + ' cached logs.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
