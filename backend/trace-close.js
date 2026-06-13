const net = require('net');
const originalClose = net.Server.prototype.close;
net.Server.prototype.close = function() {
  console.log("server close called");
  console.trace();
  return originalClose.apply(this, arguments);
};
require('./dist/index.js');
