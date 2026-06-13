const express = require('express');
const app = express();
const server = app.listen(3010, () => {
  console.log('Test server running');
});
console.log('Server returned by listen:', server.constructor.name);
console.log('Is server listening?', server.listening);
setTimeout(() => {
  console.log('Handles:', process._getActiveHandles().map(h => h.constructor.name));
}, 100);
