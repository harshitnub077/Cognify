const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/content/analyze', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up'
    }, {
      headers: {
        // Need a valid token. Let's just hit the endpoint and see if it returns 401.
      }
    });
    console.log(res.status, res.data);
  } catch (e) {
    console.log(e.response ? e.response.status : e.message);
  }
}
test();
