import prisma from './src/lib/prisma';

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Also test creating a content item or doing something simple
    console.log('Database connection is successful!');
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
