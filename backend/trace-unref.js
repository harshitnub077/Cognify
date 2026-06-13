const net = require('net');
const originalUnref = net.Server.prototype.unref;
net.Server.prototype.unref = function() {
  console.log("unref called");
  console.trace();
  return originalUnref.call(this);
};
require('./dist/index.js');
