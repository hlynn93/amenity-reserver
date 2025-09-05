const { spawn } = require('child_process');
const cron = require('node-cron');
require('dotenv').config();

/**
 * Tennis Court Reservation Scheduler
 * Automatically runs get-token and reserve-amenity scripts at specified times
 */

// Configuration from environment variables
const {
  SCHEDULE_GET_TOKEN = '0 8 * * *',      // Default: 8:00 AM daily
  SCHEDULE_RESERVE = '0 9 * * 1',        // Default: 9:00 AM every Monday
  TOKEN_REFRESH_INTERVAL = '0 */6 * * *', // Default: Every 6 hours
  ENABLE_AUTO_RESERVE = 'true'
} = process.env;

console.log('🕐 Tennis Court Scheduler Starting...');
console.log('📅 Schedules:');
console.log(`   Token Refresh: ${TOKEN_REFRESH_INTERVAL}`);
console.log(`   Get Token: ${SCHEDULE_GET_TOKEN}`);
console.log(`   Reserve Court: ${SCHEDULE_RESERVE}`);
console.log(`   Auto Reserve Enabled: ${ENABLE_AUTO_RESERVE}`);

// Function to run a script
function runScript(scriptName, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 ${new Date().toISOString()} - Starting ${description}...`);
    
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`);
        resolve(code);
      } else {
        console.error(`❌ ${description} failed with exit code ${code}`);
        reject(new Error(`${description} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`💥 Error running ${description}:`, error);
      reject(error);
    });
  });
}

// Function to run get-token and then reserve-amenity
async function runTokenAndReserve() {
  try {
    console.log('\n🎾 Starting automated court reservation process...');
    
    // First get a fresh token
    await runScript('get-token', 'Token Extraction');
    
    // Wait a moment for token to be written to .env
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Then make the reservation
    await runScript('reserve-amenity', 'Court Reservation');
    
    console.log('🏆 Automated reservation process completed!');
  } catch (error) {
    console.error('💔 Automated reservation process failed:', error);
  }
}

// Schedule token refresh (keeps token fresh)
cron.schedule(TOKEN_REFRESH_INTERVAL, () => {
  console.log('\n🔄 Scheduled token refresh triggered');
  runScript('get-token', 'Scheduled Token Refresh')
    .catch(error => console.error('Token refresh failed:', error));
}, {
  scheduled: true,
  timezone: "America/New_York" // Adjust to your timezone
});

// Schedule standalone token extraction
cron.schedule(SCHEDULE_GET_TOKEN, () => {
  console.log('\n🔑 Scheduled token extraction triggered');
  runScript('get-token', 'Scheduled Token Extraction')
    .catch(error => console.error('Token extraction failed:', error));
}, {
  scheduled: true,
  timezone: "America/New_York"
});

// Schedule court reservation (with token refresh)
if (ENABLE_AUTO_RESERVE === 'true') {
  cron.schedule(SCHEDULE_RESERVE, () => {
    console.log('\n🎾 Scheduled court reservation triggered');
    runTokenAndReserve();
  }, {
    scheduled: true,
    timezone: "America/New_York"
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Scheduler shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Scheduler shutting down...');
  process.exit(0);
});

console.log('✅ Scheduler is running. Press Ctrl+C to stop.');
console.log('📋 Next scheduled runs will be logged above...\n');
