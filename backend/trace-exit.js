const originalExit = process.exit;
process.exit = function(code) {
  console.log("process.exit called with code:", code);
  console.trace();
  originalExit.call(this, code);
};
require('./dist/index.js');
