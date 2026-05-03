import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3001/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoMetadata: { videoId: '123', title: 'Funny prank', channelName: 'Pranksters' },
        profileSnapshot: { userId: 'anon', interests: [{ topic: 'Math', depth: 'beginner' }] }
      })
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.log("Fetch failed:", e.message);
  }
}
run();
