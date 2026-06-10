import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createDemoUser() {
  console.log("Checking if user exists...");
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error(listError);
    return;
  }
  
  const existing = users.users.find(u => u.email === 'demo@example.com');
  if (existing) {
    console.log("User already exists, updating password and confirming email...");
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: 'password123',
      email_confirm: true
    });
    console.log(updateError || "Successfully reset password and confirmed email.");
  } else {
    console.log("Creating user...");
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'demo@example.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Demo User' }
    });
    console.log(error || "Successfully created demo user.");
  }
}

createDemoUser();
