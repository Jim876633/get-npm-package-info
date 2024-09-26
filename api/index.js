const express = require("express");
const bodyParser = require("body-parser");
const { fetchVersions } = require("./getVersion"); // Import fetchVersions function

const app = express();

// Use bodyParser to parse form submissions
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Root route, returns an HTML with an input form
app.get("/", (_, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            padding: 1rem;
          }
          textarea {
            width: 100%;
            height: 200px;
            padding: 1rem;
          }
          #loading {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 1000;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
          }
          #submitButton-container{
            text-align: right;
          }
          #submitButton {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin-top: 10px;
            cursor: pointer;
            border-radius: 5px;
          }
          #submitButton:hover {
            background-color: #45a049;
          }
          .button-container {
            text-align: right;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <h1>Get the latest version and update time of NPM packages</h1>
        <p>Please enter a list of NPM URLs (one per line) and submit</p>
        <div>
          <textarea name="urlList" placeholder="Please enter one URL per line"></textarea>
          <div id="submitButton-container">
            <button id="submitButton" type="button">Submit</button>
          </div>
        </div>
        <div id="loading">Loading...</div>
        <div id="result"></div>
        <script>
          const button = document.getElementById('submitButton');
          const loading = document.getElementById('loading');
          const resultDiv = document.getElementById('result');

          button.onclick = async function(event) {
            const urlList = document.querySelector('textarea[name="urlList"]').value;
            loading.style.display = 'block';
            result.innerHTML = ''
            const response = await fetch('/submit', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json', 
              },
              body: JSON.stringify({ urlList }), 
            });

            const htmlContent = await response.text();
            loading.style.display = 'none'; 
            resultDiv.innerHTML = htmlContent; 
          };
        </script>
      </body>
    </html>
  `);
});

// Handle form submission
app.post("/submit", async (req, res) => {
  const urlList = req.body.urlList
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url);

  if (urlList.length > 0) {
    const htmlContent = await fetchVersions(urlList); // Use fetchVersions function and get HTML
    res.send(htmlContent); // Return the generated HTML
  } else {
    res.send(`<h1>No valid URLs entered</h1>`);
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

module.exports = app;
