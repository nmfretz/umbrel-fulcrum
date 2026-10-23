// Redirect only the daemon log in the isolated test process.
const fs = require('node:fs');
const readFileSync = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  return readFileSync.call(this, file === '/fulcrum-logs/fulcrum.log' ? process.env.FULCRUM_TEST_LOG_FILE : file, ...args);
};
