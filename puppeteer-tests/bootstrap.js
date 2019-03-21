const express = require('express');
const puppeteer = require('puppeteer');

const PORT = 8080;

let server;

before(async function() {
  app = express();
  app.use(express.static('.'));
  server = app.listen(PORT);

  global.baseUrl = `http://localhost:${PORT}/puppeteer-tests/static/`;
  global.browser = await puppeteer.launch({
    devtools: true,
    headless: false,
  });
});

after(function() {
  global.browser.close();
  server.close();
});
