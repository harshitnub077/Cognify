const http = require('http');
const server = http.createServer((req, res) => res.end('ok'));
server.listen(3006, () => {
  console.log('Plain HTTP server running on port 3006');
});
