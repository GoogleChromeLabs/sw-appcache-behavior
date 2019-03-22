const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8080;

let server;

before(async function() {
  global.manifestVersion = 0;

  const app = express();
  app.use(express.static('.'));
  app.set('views', path.join(__dirname, 'templates'));
  app.get('/*.appcache', (req, res) => {
    const manifestName = req.url.split('/').pop();
    res.setHeader('Content-Type', 'text/cache-manifest');
    res.setHeader('Cache-Control', 'no-store');
    res.render(`${manifestName}.ejs`, {
      version: global.manifestVersion,
    }, (error, manifest) => {
      if (error) {
        res.sendStatus(404);
      } else {
        res.send(manifest);
      }
    });
  });
  server = app.listen(PORT);

  global.baseUrl = `http://localhost:${PORT}/puppeteer-tests/static/`;
  global.browser = await puppeteer.launch({
    devtools: true,
    headless: false,
  });
});

after(async function() {
  global.browser.close();
  server.close();
  await new Promise((resolve) => {});
});
