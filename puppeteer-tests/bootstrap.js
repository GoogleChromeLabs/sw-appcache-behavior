const dhost = require('dhost');
const polka = require('polka');
const puppeteer = require('puppeteer');

const PORT = 8080;

let polkaInstance;

before(async function() {
  polkaInstance = polka();
  polkaInstance.use(dhost()).listen(PORT);

  global.baseUrl = `http://localhost:${PORT}/puppeteer-tests/static/`;
  global.browser = await puppeteer.launch({
    devtools: true,
    headless: false,
  });
});

after(function() {
  global.browser.close();
  polkaInstance.server.close();
});
