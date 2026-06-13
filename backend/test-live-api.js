const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key + '=')).split('=')[1].replace(/"/g, '');
const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: demoData, error: demoErr } = await supabase.auth.signInWithPassword({
    email: 'demo@example.com',
    password: 'password'
  });
  if (demoErr) return console.error('Demo login failed:', demoErr.message);

  const token = demoData.session.access_token;
  console.log('Got token, calling API...');
  
  try {
    const res = await axios.get('https://cognify-api-lin2.onrender.com/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('API ERROR:', err.response ? err.response.status : err.message);
    if (err.response) console.error(err.response.data);
  }
}
test();
