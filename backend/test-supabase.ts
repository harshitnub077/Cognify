import { requireAuth, AuthRequest, supabase } from './src/middleware/auth';

async function test() {
  console.log("Testing Supabase...");
  // I need a valid token to test getUser, but if it hangs even on invalid token?
  try {
    const res = await supabase.auth.getUser('invalid-token-123');
    console.log("Supabase response:", res);
  } catch (e) {
    console.error("Supabase threw:", e);
  }
}
test().catch(console.error).finally(() => process.exit(0));
