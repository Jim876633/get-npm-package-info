const puppeteerCore = require("puppeteer-core");
const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const environment = process.env.NODE_ENV || "development";

const getInfoFromNpm = async (page, url) => {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const data = await page.evaluate(() => {
      const versionElement = document.querySelector("p.f2874b88");
      const publishTimeElement = document.querySelector("time[datetime]");

      return {
        version: versionElement?.innerText ?? "Version not found",
        lastPublishTime:
          publishTimeElement?.getAttribute("datetime") ??
          "Publish time not found",
      };
    });

    if (data.lastPublishTime !== "Publish time not found") {
      const date = new Date(data.lastPublishTime);
      data.lastPublishTime = date
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "/");
    }

    return { url, ...data };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return { url, version: "Error", lastPublishTime: "Error" };
  }
};

const generateHtmlTable = (results) => {
  let urlsColumn = results.map(({ url }) => `<li>${url}</li>`).join("\n");
  let totalCount = results.length;

  let versionsColumn = results
    .map(({ version }) => `<li>${version}</li>`)
    .join("\n");

  let publishTimesColumn = results
    .map(({ lastPublishTime }) => `<li>${lastPublishTime}</li>`)
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NPM Versions</title>
  <style>
    .container {
      display: flex;
      gap: 1rem;
    }
    .column {
      min-width: 220px;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 5px;
    }
    .column-url {
      flex: 1;
    }
    h2 {
      text-align: center;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    li {
      background-color: #f0f0f0; /* Add background color */
      margin-bottom: 5px; /* Add gap between li elements */
      padding: 5px; /* Optional: add padding for better appearance */
      border-radius: 3px; /* Optional: rounded corners */
    }
    li:nth-child(odd) {
      background-color: #e0e0e0; /* Different background color for odd rows */
    }
  </style>
</head>
<body>
  <h1>NPM Package Versions (${totalCount})</h1>
  <div class="container">
    <div class="column column-url">
      <h2>URLs</h2>
      <ul>
        ${urlsColumn}
      </ul>
    </div>
    <div class="column">
      <h2>Versions</h2>
      <ul>
        ${versionsColumn}
      </ul>
    </div>
    <div class="column">
      <h2>Last Publish Times</h2>
      <ul>
        ${publishTimesColumn}
      </ul>
    </div>
  </div>
</body>
</html>`;
};

const fetchVersions = async (urls, concurrency = 10) => {
  let browser;
  console.log(environment);
  if (environment === "development") {
    browser = await puppeteer.launch({
      headless: true,
    });
  } else {
    const executablePath = await chromium.executablePath();
    browser = await puppeteerCore.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });
  }

  const results = [];

  try {
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(async (url) => {
        const page = await browser.newPage();
        try {
          if (!url.startsWith("https://www.npmjs.com/package/"))
            return {
              url,
              version: "Not npm package url",
              lastPublishTime: "Not npm package url",
            };
          return await getInfoFromNpm(page, url);
        } finally {
          await page.close();
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      batchResults.forEach(({ url, version, lastPublishTime }) => {
        console.log(
          `${url}: Version: ${version}, Last Publish Time: ${lastPublishTime}`
        );
      });
    }

    const htmlContent = generateHtmlTable(results); // Generate HTML table
    return htmlContent; // Return generated HTML
  } catch (error) {
    console.error("An error occurred:", error);
    return "<h1>An error occurred</h1>"; // Return error message
  } finally {
    await browser.close();
  }
};

module.exports = { fetchVersions };
