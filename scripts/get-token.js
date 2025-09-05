const puppeteer = require("puppeteer");
require("dotenv").config();

/**
 * Token extraction script with network request interception
 * This script handles login flow and captures all network requests
 */
async function getToken() {
  console.log("Starting token extraction script...");

  // Load environment variables
  const {
    URL,
    USERNAME_SELECTOR,
    PASSWORD_SELECTOR,
    SUBMIT_SELECTOR,
    USERNAME,
    PASSWORD,
  } = process.env;

  // Validate required environment variables
  if (
    !URL ||
    !USERNAME_SELECTOR ||
    !PASSWORD_SELECTOR ||
    !SUBMIT_SELECTOR ||
    !USERNAME ||
    !PASSWORD
  ) {
    console.error(
      "Missing required environment variables. Please check your .env file."
    );
    console.log(
      "Required variables: URL, USERNAME_SELECTOR, PASSWORD_SELECTOR, SUBMIT_SELECTOR, USERNAME, PASSWORD"
    );
    return;
  }

  // Remove quotes from selectors if present
  const cleanUsernameSelector = USERNAME_SELECTOR.replace(/['"]/g, "");
  const cleanPasswordSelector = PASSWORD_SELECTOR.replace(/['"]/g, "");
  const cleanSubmitSelector = SUBMIT_SELECTOR.replace(/['"]/g, "");

  console.log("Using selectors:", {
    username: cleanUsernameSelector,
    password: cleanPasswordSelector,
    submit: cleanSubmitSelector,
  });

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // Create new page
    const page = await browser.newPage();

    // Create output directory if it doesn't exist
    const fs = require("fs");
    const outputDir = "output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    // Array to store all network requests
    const networkRequests = [];
    let accessToken = null;

    // Enable request interception
    await page.setRequestInterception(true);

    // Intercept all requests
    page.on("request", (request) => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString(),
      };
      networkRequests.push(requestInfo);
      console.log(`📤 ${request.method()} ${request.url()}`);

      // Continue the request
      request.continue();
    });

    // Intercept all responses
    page.on("response", async (response) => {
      console.log(`📥 ${response.status()} ${response.url()}`);

      // Check if this is the token endpoint
      if (response.url().endsWith("token") && response.status() === 200) {
        try {
          const responseText = await response.text();
          console.log("🔑 Token response found!");
          console.log("Response body:", responseText);

          // Parse the JSON response
          const tokenData = JSON.parse(responseText);
          if (tokenData.access_token) {
            accessToken = tokenData.access_token;
            console.log(
              "✅ Access token extracted:",
              accessToken.substring(0, 50) + "..."
            );
          }
        } catch (error) {
          console.error("Error parsing token response:", error.message);
        }
      }
    });

    // Navigate to the specified URL and wait for redirection to complete
    console.log(`Navigating to ${URL}...`);
    await page.goto(URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit for any additional redirections
    console.log("Waiting for redirections to complete...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get current URL after redirections
    const currentUrl = page.url();
    console.log(`Current URL after redirections: ${currentUrl}`);

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Take a screenshot of the current state
    await page.screenshot({
      path: "output/after-redirect.png",
      fullPage: true,
    });

    // Wait for and fill username
    console.log(
      `Looking for username field with selector: ${cleanUsernameSelector}`
    );
    try {
      await page.waitForSelector(cleanUsernameSelector, { timeout: 10000 });
      console.log("Username field found. Filling username...");
      await page.type(cleanUsernameSelector, USERNAME);
    } catch (error) {
      console.error("Username field not found:", error.message);
      // Try to find the field by different methods
      const inputs = await page.$$(
        'input[type="text"], input[type="email"], input[name*="user"], input[id*="user"]'
      );
      if (inputs.length > 0) {
        console.log("Found alternative username field, trying first match...");
        await inputs[0].type(USERNAME);
      } else {
        throw new Error("No username field found");
      }
    }

    // Wait for and fill password
    console.log(
      `Looking for password field with selector: ${cleanPasswordSelector}`
    );
    try {
      await page.waitForSelector(cleanPasswordSelector, { timeout: 10000 });
      console.log("Password field found. Filling password...");
      await page.type(cleanPasswordSelector, PASSWORD);
    } catch (error) {
      console.error("Password field not found:", error.message);
      // Try to find the field by different methods
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length > 0) {
        console.log("Found alternative password field, trying first match...");
        await passwordInputs[0].type(PASSWORD);
      } else {
        throw new Error("No password field found");
      }
    }

    // Take a screenshot before submitting
    console.log("Taking screenshot before submit...");
    await page.screenshot({
      path: "output/before-submit.png",
      fullPage: true,
    });

    // Find and click submit button
    console.log(
      `Looking for submit button with selector: ${cleanSubmitSelector}`
    );
    try {
      await page.waitForSelector(cleanSubmitSelector, { timeout: 10000 });
      console.log("Submit button found. Clicking...");
      await page.click(cleanSubmitSelector);
    } catch (error) {
      console.error("Submit button not found:", error.message);
      // Try to find the button by different methods
      const buttons = await page.$$(
        'button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign")'
      );
      if (buttons.length > 0) {
        console.log("Found alternative submit button, trying first match...");
        await buttons[0].click();
      } else {
        throw new Error("No submit button found");
      }
    }

    // Wait for redirection after login
    console.log("Waiting for login redirection...");
    try {
      await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    } catch (error) {
      console.log(
        "No navigation detected, checking if we are on a new page..."
      );
    }

    // Wait a bit more for any additional requests
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Get final URL
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);

    // Take a final screenshot
    console.log("Taking final screenshot...");
    await page.screenshot({
      path: "output/after-login.png",
      fullPage: true,
    });

    // Log all network requests
    console.log('\n=== NETWORK REQUESTS SUMMARY ===');
    console.log(`Total requests captured: ${networkRequests.length}\n`);
    
    networkRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`   POST Data: ${req.postData.substring(0, 200)}${req.postData.length > 200 ? '...' : ''}`);
      }
      console.log(`   Timestamp: ${req.timestamp}`);
      console.log('');
    });

    // Save access token if found
    if (accessToken) {
      // Read current .env file
      const fs = require("fs");
      let envContent = "";
      
      try {
        envContent = fs.readFileSync(".env", "utf8");
      } catch (error) {
        console.log("Could not read .env file, creating new one...");
      }
      
      // Check if ACCESS_TOKEN already exists in .env
      const accessTokenRegex = /^ACCESS_TOKEN=.*$/m;
      const newTokenLine = `ACCESS_TOKEN=${accessToken}`;
      
      if (accessTokenRegex.test(envContent)) {
        // Replace existing ACCESS_TOKEN
        envContent = envContent.replace(accessTokenRegex, newTokenLine);
        console.log("✅ Updated existing ACCESS_TOKEN in .env file");
      } else {
        // Add new ACCESS_TOKEN
        envContent += envContent.endsWith('\n') ? '' : '\n';
        envContent += `\n# Access Token\n${newTokenLine}\n`;
        console.log("✅ Added new ACCESS_TOKEN to .env file");
      }
      
      // Write updated content back to .env file
      fs.writeFileSync(".env", envContent);
      console.log(`🔑 ACCESS TOKEN: ${accessToken.substring(0, 50)}...`);
      
      return accessToken;
    } else {
      console.log("❌ No access token found in responses");
      return null;
    }

    console.log("Token extraction script completed successfully!");
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Close browser
    await browser.close();
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  getToken()
    .then((token) => {
      if (token) {
        console.log(
          "\n🎉 SUCCESS! Access token retrieved:",
          token.substring(0, 50) + "..."
        );
      } else {
        console.log("\n❌ FAILED! No access token found.");
      }
    })
    .catch(console.error);
}

module.exports = { getToken };
