import prisma from './src/lib/prisma';
async function test() {
  console.log("Checking prisma...");
  const count = await prisma.user.count();
  console.log("Count:", count);
}
test().catch(console.error).finally(() => process.exit(0));
