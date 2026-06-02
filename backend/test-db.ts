import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    await prisma.$connect()
    console.log("Connected!")
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
