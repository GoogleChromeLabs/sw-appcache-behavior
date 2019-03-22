const puppeteer = require('puppeteer');

const PORT = 8080;
let server;

before(async function() {
  server = require('./server');

  global.browser = await puppeteer.launch({
    devtools: true,
    headless: false,
  });
});

after(async function() {
  global.browser.close();
  server.close();
});
