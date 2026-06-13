const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then(count => console.log('Count:', count))
  .catch(err => console.error('Prisma Error:', err))
  .finally(() => prisma.$disconnect());
