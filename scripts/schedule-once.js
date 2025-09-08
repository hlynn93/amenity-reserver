const { spawn } = require('child_process');
const cron = require('node-cron');
require('dotenv').config();

/**
 * One-time Tennis Court Reservation Scheduler
 * Usage: node scripts/schedule-once.js "2025-09-11 09:00"
 */

// Get command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('❌ Error: Please provide a date and time or just a time for today.');
  console.log('📋 Usage (full date): npm run schedule-once "2025-09-11 09:00"');
  console.log('📋 Usage (today):     npm run schedule-once "14:30"');
  console.log('📋 Format: YYYY-MM-DD HH:MM or HH:MM (24-hour format)');
  process.exit(1);
}

const dateTimeString = args[0];
console.log(`🎯 Scheduling one-time reservation for: ${dateTimeString}`);

// Parse the input date and time
function parseDateTime(dateTimeStr) {
  try {
    // Handle different formats
    let targetDate;
    
    if (dateTimeStr.includes('T')) {
      // ISO format: 2025-09-11T09:00:00
      targetDate = new Date(dateTimeStr);
    } else if (dateTimeStr.includes(' ')) {
      // Space format: "2025-09-11 09:00"
      targetDate = new Date(dateTimeStr.replace(' ', 'T'));
    } else if (dateTimeStr.match(/^\d{1,2}:\d{2}$/)) { // Time only format: "09:00" or "9:00"
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePart = `${year}-${month}-${day}`;
      targetDate = new Date(`${datePart}T${dateTimeStr}`);
    } else {
      throw new Error('Invalid format');
    }
    
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid date');
    }
    
    return targetDate;
  } catch (error) {
    console.error('❌ Error parsing date/time:', error.message);
    console.log('📋 Please use format: "YYYY-MM-DD HH:MM" or "HH:MM" for today.');
    process.exit(1);
  }
}

const targetDateTime = parseDateTime(dateTimeString);
const tokenDateTime = new Date(targetDateTime.getTime() - 60000); // 1 minute before
const now = new Date();

// Validate that the target time is in the future
if (targetDateTime <= now) {
  console.error('❌ Error: Target time must be in the future');
  console.log(`   Current time: ${now.toLocaleString()}`);
  console.log(`   Target time:  ${targetDateTime.toLocaleString()}`);
  process.exit(1);
}

console.log(`🕐 Current time:    ${now.toLocaleString()}`);
console.log(`🔑 Token time:      ${tokenDateTime.toLocaleString()} (1 minute before)`);
console.log(`🎾 Reservation time: ${targetDateTime.toLocaleString()}`);

// Convert to cron format
function toCronFormat(date) {
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${minutes} ${hours} ${day} ${month} *`;
}

const tokenCron = toCronFormat(tokenDateTime);
const reservationCron = toCronFormat(targetDateTime);

console.log(`🔧 Token cron:      ${tokenCron}`);
console.log(`🔧 Reservation cron: ${reservationCron}`);

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

// Schedule token extraction (1 minute before)
const tokenTask = cron.schedule(tokenCron, async () => {
  console.log('\n🔑 Executing scheduled token extraction...');
  try {
    await runScript('get-token', 'Token Extraction');
    console.log('✅ Token extraction completed, ready for reservation!');
  } catch (error) {
    console.error('❌ Token extraction failed:', error);
  }
}, {
  scheduled: false // Don't start immediately
});

// Schedule court reservation (at exact time)
const reservationTask = cron.schedule(reservationCron, async () => {
  console.log('\n🎾 Executing scheduled court reservation...');
  try {
    await runScript('reserve-amenity', 'Court Reservation');
    console.log('🏆 Court reservation completed!');
    
    // Exit after successful reservation
    console.log('🎉 All tasks completed successfully. Exiting...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Court reservation failed:', error);
    process.exit(1);
  }
}, {
  scheduled: false // Don't start immediately
});

// Start the scheduled tasks
console.log('\n🚀 Starting one-time scheduler...');
tokenTask.start();
reservationTask.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Scheduler interrupted. Cleaning up...');
  tokenTask.destroy();
  reservationTask.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Scheduler terminated. Cleaning up...');
  tokenTask.destroy();
  reservationTask.destroy();
  process.exit(0);
});

// Calculate time until execution
const timeUntilToken = tokenDateTime.getTime() - now.getTime();
const timeUntilReservation = targetDateTime.getTime() - now.getTime();

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

console.log(`⏰ Time until token extraction: ${formatDuration(timeUntilToken)}`);
console.log(`⏰ Time until reservation: ${formatDuration(timeUntilReservation)}`);
console.log('\n📋 Scheduler is now running. Press Ctrl+C to cancel.');
console.log('🔄 The process will automatically exit after the reservation is complete.\n');
