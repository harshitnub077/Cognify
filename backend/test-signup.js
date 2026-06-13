const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key + '=')).split('=')[1].replace(/"/g, '');
const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'));

async function test() {
  const email = `testuser${Date.now()}@gmail.com`;
  const { data, error } = await supabase.auth.signUp({ email, password: 'password123' });
  if (error) return console.error('SignUp failed:', error.message);

  const token = data.session.access_token;
  console.log('Got token, calling API...');
  
  try {
    const res = await axios.post('https://cognify-api-lin2.onrender.com/api/user/onboarding', {
        identities: ["test goal"], reduceGoals: [], platforms: []
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('API ERROR:', err.response ? err.response.status : err.message);
    if (err.response) console.error(err.response.data);
  }
}
test();
