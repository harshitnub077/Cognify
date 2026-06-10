const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const profile = await prisma.userProfile.findFirst();
  console.log(JSON.stringify(profile, null, 2));
}
run();
