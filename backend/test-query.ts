import prisma from './src/lib/prisma';
prisma.contentLog.findFirst({orderBy: {createdAt: 'desc'}}).then(r => console.log(JSON.stringify(r, null, 2))).finally(() => prisma.$disconnect());
