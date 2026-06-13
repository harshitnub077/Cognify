const originalKill = process.kill;
process.kill = function(pid, signal) {
  console.log("kill called", pid, signal);
  console.trace();
  return originalKill.call(this, pid, signal);
};
require('./dist/index.js');
