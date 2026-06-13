import prisma from './src/lib/prisma';
async function run() {
  const users = await prisma.user.findMany();
  console.log("USERS:", users.length);
  process.exit(0);
}
run();
