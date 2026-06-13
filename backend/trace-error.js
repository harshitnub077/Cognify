const express = require('express');
const originalListen = express.application.listen;
express.application.listen = function() {
  const server = originalListen.apply(this, arguments);
  const emit = server.emit;
  server.emit = function(event, err) {
    if (event === 'error') console.log("Server error:", err);
    return emit.apply(this, arguments);
  };
  return server;
};
require('./dist/index.js');
