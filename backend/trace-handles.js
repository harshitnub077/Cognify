const http = require('http');
require('./dist/index.js');
setTimeout(() => {
  console.log('Active handles:', process._getActiveHandles().length);
  console.log(process._getActiveHandles().map(h => h.constructor.name));
}, 100);
