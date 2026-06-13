const http = require('http');
const originalCreateServer = http.createServer;
http.createServer = function() {
  console.log("http.createServer called!");
  return originalCreateServer.apply(this, arguments);
};
require('./dist/index.js');
