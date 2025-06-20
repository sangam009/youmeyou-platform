const { spawn } = require('child_process');
const path = require('path');
const { connect, closeDatabase } = require('./helpers/test-setup');

async function runTests() {
  try {
    // Connect to test database
    await connect();
    console.log('Connected to test database');

    // Run the tests
    const testProcess = spawn('mocha', [
      'tests/**/*.test.js',
      '--timeout',
      '10000',
      '--exit'
    ], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', async (code) => {
      // Close database connection
      await closeDatabase();
      console.log('Closed database connection');
      
      process.exit(code);
    });
  } catch (error) {
    console.error('Test setup failed:', error);
    process.exit(1);
  }
}

runTests(); 