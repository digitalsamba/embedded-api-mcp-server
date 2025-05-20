/**
 * Test script to validate the metrics functionality
 */

// Run directly without importing the module
console.log("Testing metrics functionality...");

// Execute single command without starting the server
const { exec } = require('child_process');

exec('npm run dev -- --enable-metrics --port=3456 --no-auto-start', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  
  console.log(`stdout: ${stdout}`);
  console.log("Test completed successfully!");
});
