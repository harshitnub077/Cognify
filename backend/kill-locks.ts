import { Client } from 'pg';
async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.nlujpnngemujgkplbqbi:Porschegt3rs%40123@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
  });
  await client.connect();
  const res = await client.query(`
    SELECT pg_terminate_backend(pid), state, query
    FROM pg_stat_activity 
    WHERE state = 'idle in transaction' AND pid <> pg_backend_pid();
  `);
  console.log("Terminated idle in transaction:", res.rows);
  await client.end();
}
main().catch(console.error);
