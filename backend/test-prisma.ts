import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const yearAgo = new Date();
        yearAgo.setDate(yearAgo.getDate() - 365);
        const logs = await prisma.contentLog.findMany({
            where: { createdAt: { gte: yearAgo.toISOString() } }
        });
        console.log("Success:", logs.length);
    } catch(e: any) {
        console.error("Error:", e.message);
    }
}
main();
