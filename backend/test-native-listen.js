const http = require('http');
console.log('Is http.Server.prototype.listen native?', http.Server.prototype.listen.toString().includes('[native code]'));
require('./dist/index.js');
