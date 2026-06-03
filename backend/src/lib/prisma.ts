import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const rawUrl = process.env.DATABASE_URL || '';

let prisma: PrismaClient;

if (!global.__prisma) {
  if (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://')) {
    const pool = new Pool({ connectionString: rawUrl, max: 10 });
    const adapter = new PrismaPg(pool);
    global.__prisma = new PrismaClient({ adapter } as any);
  } else {
    console.warn('DATABASE_URL is not a valid postgres URL. Database queries will fail.');
    global.__prisma = new PrismaClient();
  }
}

prisma = global.__prisma;

export default prisma;
