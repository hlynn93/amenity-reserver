# Tennis Court Reservation Automation

This project automates tennis court reservations with multiple scheduling options.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your credentials in `.env`:**
   ```bash
   USERNAME="your-email@example.com"
   PASSWORD="your-password"
   ```

3. **Run manually:**
   ```bash
   # Get access token
   npm run get-token
   
   # Make a reservation
   npm run reserve-amenity
   ```

4. **Start the scheduler:**
   ```bash
   npm start
   # or
   npm run scheduler
   ```

## ⏰ Scheduling Options

### Option 1: Node.js Scheduler (Recommended)
- **Built-in scheduler** using `node-cron`
- **Configurable via .env** variables
- **Automatic token refresh**
- **Runs continuously**

**Default Schedule:**
- 🔄 Token refresh: Every 6 hours
- 🔑 Get token: 8:00 AM daily
- 🎾 Reserve court: 9:00 AM every Monday

### Option 2: System Cron (Linux/macOS)
Add to your crontab (`crontab -e`):
```bash
# Reserve tennis court every Monday at 9:00 AM
0 9 * * 1 cd /path/to/tfc && npm run get-token && npm run reserve-amenity

# Refresh token every 6 hours
0 */6 * * * cd /path/to/tfc && npm run get-token
```

### Option 3: Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Weekly, Monday, 9:00 AM)
4. Set action: Start a program
5. Program: `cmd`
6. Arguments: `/c cd /path/to/tfc && npm run get-token && npm run reserve-amenity`

### Option 4: PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Start scheduler with PM2
pm2 start scripts/scheduler.js --name "tennis-scheduler"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## ⚙️ Configuration

Edit `.env` file to customize schedules:

```bash
# Cron format: "minute hour day month weekday"
SCHEDULE_GET_TOKEN="0 8 * * *"           # 8:00 AM daily
SCHEDULE_RESERVE="0 9 * * 1"             # 9:00 AM every Monday
TOKEN_REFRESH_INTERVAL="0 */6 * * *"     # Every 6 hours
ENABLE_AUTO_RESERVE="true"               # Enable/disable auto reservations
```

### Cron Schedule Examples:
- `"0 8 * * *"` - 8:00 AM every day
- `"0 9 * * 1"` - 9:00 AM every Monday
- `"0 18 * * 5"` - 6:00 PM every Friday
- `"*/30 * * * *"` - Every 30 minutes
- `"0 */6 * * *"` - Every 6 hours

## 🎾 How It Works

1. **Token Extraction** (`get-token.js`):
   - Opens browser
   - Logs into the tennis court system
   - Extracts authentication token
   - Saves token to `.env` file

2. **Court Reservation** (`reserve-amenity.js`):
   - Uses stored token
   - Calculates reservation time (7 days from now)
   - Tries Tennis Court 1, falls back to Court 2
   - Books 1-hour slot

3. **Scheduler** (`scheduler.js`):
   - Runs token refresh and reservations automatically
   - Handles failures gracefully
   - Logs all activities

## 🛠️ Available Scripts

- `npm run get-token` - Extract authentication token
- `npm run reserve-amenity` - Make a court reservation
- `npm run scheduler` - Start the scheduler
- `npm start` - Start the scheduler (alias)

## 📋 Logs

The scheduler provides detailed logging:
- ✅ Successful operations
- ❌ Failed operations
- 🕐 Next scheduled times
- 📊 Reservation details

## 🔧 Troubleshooting

1. **Token expires**: Tokens are automatically refreshed every 6 hours
2. **Courts unavailable**: Script tries both courts automatically
3. **Network issues**: Scheduler will retry on the next scheduled run
4. **Browser issues**: Make sure you have sufficient RAM and display

## 🚀 Production Deployment

For production use, consider:
1. **PM2** for process management
2. **Docker** for containerization
3. **Monitoring** with logs and alerts
4. **Backup schedules** in case of failures
