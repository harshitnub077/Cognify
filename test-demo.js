import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDemo() {
  console.log("Trying to sign in...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'demo@example.com',
    password: 'password123'
  });
  
  if (signInError) {
    console.log("Sign in failed:", signInError.message);
    if (signInError.message.includes('Invalid login credentials')) {
      console.log("Trying to sign up...");
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'demo@example.com',
        password: 'password123'
      });
      if (signUpError) {
        console.log("Sign up failed:", signUpError.message);
      } else {
        console.log("Sign up successful. User:", signUpData.user);
      }
    }
  } else {
    console.log("Sign in successful!");
  }
}
testDemo();
