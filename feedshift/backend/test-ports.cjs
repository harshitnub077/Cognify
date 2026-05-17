const http = require('http');
[3001, 3002, 3005, 3010, 3050, 4000, 5000].forEach(port => {
  const server = http.createServer();
  server.on('error', (e) => console.log(`Port ${port} failed: ${e.message}`));
  server.listen(port, () => {
    console.log(`Port ${port} success!`);
    server.close();
  });
});
