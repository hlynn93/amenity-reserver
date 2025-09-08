var https = require("follow-redirects").https;
var fs = require("fs");
// Force dotenv to reload the .env file every time
require("dotenv").config({ override: true });

// Load environment variables
const {
  ACCESS_TOKEN,
  OCCUPANT_ID,
  AMENITY_TYPE_ID,
  TENNIS_COURT_1,
  TENNIS_COURT_2,
  GUESTS,
  AMENITY_RESERVATION_TYPE,
  START_TIME,
  END_TIME,
  AMENITY_ID,
} = process.env;

// Validate required environment variables
if (!ACCESS_TOKEN) {
  console.error("❌ ACCESS_TOKEN is required. Please run get-token.js first.");
  process.exit(1);
}

// Function to generate dynamic reservation times
function generateReservationTimes() {
  const now = new Date();

  // Add 7 days to current date
  const reservationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  reservationDate.setMinutes(reservationDate.getMinutes(), 0, 0);

  // Create end time (1 hour later)
  const endDate = new Date(reservationDate.getTime() + 60 * 60 * 1000);

  // Format as ISO string with timezone offset
  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");

    // Get timezone offset in format -04:00
    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset >= 0 ? "+" : "-";
    const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${formattedOffset}`;
  };

  const startTime = formatDateTime(reservationDate);
  const endTime = formatDateTime(endDate);

  console.log(`📅 Calculated reservation times:`);
  console.log(`   Start: ${startTime}`);
  console.log(`   End: ${endTime}`);

  return { startTime, endTime };
}

// Function to make reservation request
function makeReservation(courtId, courtName) {
  return new Promise((resolve, reject) => {
    const { startTime, endTime } = generateReservationTimes();

    var options = {
      method: "POST",
      hostname: "api.atriumapp.co",
      path: `/api/v1/my/occupants/${OCCUPANT_ID}/amenity-reservations/`,
      headers: {
        accept: "*/*",
        "accept-language": "en-GB,en;q=0.9,en-US;q=0.8,zh-CN;q=0.7,zh;q=0.6",
        "content-type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      maxRedirects: 20,
    };

    var postData = JSON.stringify({
      amenity_type_id: AMENITY_TYPE_ID || "10",
      start_time: START_TIME || startTime,
      end_time: END_TIME || endTime,
      amenity_id: courtId,
      guests: GUESTS || "1",
      amenity_reservation_type: AMENITY_RESERVATION_TYPE || "TR",
    });

    console.log(`🎾 Trying ${courtName} (ID: ${courtId})...`);
    console.log(
      "� Authorization Header:",
      `Bearer ${ACCESS_TOKEN.substring(0, 20)}...`,
    );
    console.log("�📊 Payload:", JSON.stringify(JSON.parse(postData), null, 2));

    var req = https.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        console.log(`📥 Response Status for ${courtName}:`, res.statusCode);
        console.log("📄 Response Body:", body.toString());

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ ${courtName} reservation successful!`);
          resolve({
            success: true,
            court: courtName,
            response: body.toString(),
          });
        } else {
          console.log(`❌ ${courtName} reservation failed!`);
          resolve({
            success: false,
            court: courtName,
            response: body.toString(),
            status: res.statusCode,
          });
        }
      });

      res.on("error", function (error) {
        console.error(`💥 Request error for ${courtName}:`, error);
        reject(error);
      });
    });

    req.write(postData);
    req.end();
  });
}

// Main execution function
async function reserveAmenity() {
  console.log("🚀 Starting amenity reservation process...");
  console.log("🔑 Using access token:", ACCESS_TOKEN.substring(0, 50) + "...");

  try {
    // Try TENNIS_COURT_2 first
    const court2Result = await makeReservation(
      TENNIS_COURT_2 || "10",
      "Tennis Court 2",
    );

    if (court2Result.success) {
      console.log("🎉 Successfully reserved Tennis Court 2!");
      return court2Result;
    }

    console.log("⚠️ Tennis Court 1 failed, trying Tennis Court 2...");

    // Try TENNIS_COURT_1 if first attempt failed
    const court1Result = await makeReservation(
      TENNIS_COURT_2 || "8",
      "Tennis Court 1",
    );

    if (court1Result.success) {
      console.log("🎉 Successfully reserved Tennis Court 1!");
      return court1Result;
    }

    console.log("💔 Both courts failed to reserve");
    return court1Result;
  } catch (error) {
    console.error("💥 Error during reservation process:", error);
    throw error;
  }
}

// Execute the reservation process
reserveAmenity()
  .then((result) => {
    if (result.success) {
      console.log(`\n🏆 FINAL RESULT: Successfully reserved ${result.court}!`);
    } else {
      console.log(
        `\n💔 FINAL RESULT: Failed to reserve any court. Last attempt was ${result.court}.`,
      );
    }
  })
  .catch((error) => {
    console.error("\n💥 FINAL RESULT: Process failed with error:", error);
  });
