const express = require('express');
const originalListen = express.application.listen;
express.application.listen = function() {
  console.log("express app.listen arguments:", arguments);
  const server = originalListen.apply(this, arguments);
  setTimeout(() => {
    console.log("Server listening?", server.listening);
  }, 100);
  return server;
};
require('./dist/index.js');
