const express = require('express');
const app = express();
app.listen(3005, () => {
  console.log('Test server running on port 3005');
  setTimeout(() => {
    console.log('Test active handles:', process._getActiveHandles().map(h => h.constructor.name));
  }, 100);
});
