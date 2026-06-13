const express = require('express');
const originalListen = express.application.listen;
express.application.listen = function() {
  const server = originalListen.apply(this, arguments);
  const emit = server.emit;
  server.emit = function(event) {
    console.log("Server event emitted:", event);
    return emit.apply(this, arguments);
  };
  return server;
};
require('./dist/index.js');
