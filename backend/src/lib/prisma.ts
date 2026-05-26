import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const rawUrl = process.env.DATABASE_URL || '';

let prisma: PrismaClient;

if (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://')) {
  const pool = new Pool({ connectionString: rawUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter } as any);
} else {
  console.warn('DATABASE_URL is not a valid postgres URL. Database queries will fail.');
  prisma = new PrismaClient();
}

export default prisma;
