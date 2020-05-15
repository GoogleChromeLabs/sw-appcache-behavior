/*
 Copyright 2019 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// See https://mochajs.org/#delayed-root-suite
(async () => {
  const {expect} = require('chai');
  const puppeteerChrome = require('puppeteer');
  const puppeteerFirefox = require('puppeteer-firefox');
  const UAParser = require('ua-parser-js');

  const browserToUserAgentMapping = new Map();
  for (const puppeteer of [puppeteerChrome, puppeteerFirefox]) {
    // Disable devtools and enable headless when we're in the CI environment.
    const config = {
      devtools: process.env.CI !== 'true',
      headless: process.env.CI === 'true',
    };
    const browser = await puppeteer.launch(config);

    const userAgentString = await browser.userAgent();
    const uaParser = new UAParser(userAgentString);
    const {name, version} = uaParser.getBrowser();

    browserToUserAgentMapping.set(browser, `${name} ${version}`);
  }

  let server;
  before(function() {
    server = require('./server');
  });

  after(function() {
    server.close();
  });

  for (const [browser, userAgent] of browserToUserAgentMapping) {
    describe(`End-to-End Tests [${userAgent}]`, function() {
      let page;
      let context;

      before(async function() {
        context = await browser.createIncognitoBrowserContext();
        page = await browser.newPage();
        page.on('console', (msg) => {
          const text = msg.text();
          if (text.includes('Application Cache')) {
            return;
          }
          const color = msg.type === 'error' ?
            '\x1b[31m%s\x1b[0m' :
            '\x1b[36m%s\x1b[0m';
          console.log(color, `${text}\n↪ [${msg.location().url}]\n`);
        });
      });

      beforeEach(function() {
        global.manifestVersion = 1;
        global.requestCounter.reset();
      });

      after(async function() {
        await context.close();
        browser.close();
      });

      it('should create the initial cache entries', async function() {
        await page.goto(`${global.baseUrl}step1.html`);
        await page.evaluate(async () => {
          await window.setupComplete;
        });

        const expectedCacheName = 'efe1a9f22297dec3101383dea9f670a4e38d32d86e2917702b0bee26d370d459';

        const caches = await page.evaluate(() => caches.keys());
        expect(caches).to.have.members([expectedCacheName]);

        const cacheEntries = await page.evaluate(async (expectedCacheName) => {
          const cache = await caches.open(expectedCacheName);
          const keys = await cache.keys();
          return keys.map((request) => request.url);
        }, expectedCacheName);
        expect(cacheEntries).to.have.members([
          `${global.baseUrl}common.css`,
          `${global.baseUrl}step1.html`,
        ]);
      });

      it('should add a new master entry for an additional navigation', async function() {
        await page.goto(`${global.baseUrl}step2.html`);
        await page.evaluate(async () => {
          await window.setupComplete;
        });

        const expectedCacheName = 'efe1a9f22297dec3101383dea9f670a4e38d32d86e2917702b0bee26d370d459';

        const caches = await page.evaluate(() => caches.keys());
        expect(caches).to.have.members([expectedCacheName]);

        const cacheEntries = await page.evaluate(async (expectedCacheName) => {
          const cache = await caches.open(expectedCacheName);
          const keys = await cache.keys();
          return keys.map((request) => request.url);
        }, expectedCacheName);
        expect(cacheEntries).to.have.members([
          `${global.baseUrl}common.css`,
          `${global.baseUrl}step1.html`,
          `${global.baseUrl}step2.html`,
        ]);
      });

      it('should not create a master entry when navigating to a page with no manifest', async function() {
        await page.goto(`${global.baseUrl}step3.html`);
        await page.evaluate(async () => {
          await window.setupComplete;
        });

        const expectedCacheName = 'efe1a9f22297dec3101383dea9f670a4e38d32d86e2917702b0bee26d370d459';

        const caches = await page.evaluate(() => caches.keys());
        expect(caches).to.have.members([expectedCacheName]);

        const cacheEntries = await page.evaluate(async (expectedCacheName) => {
          const cache = await caches.open(expectedCacheName);
          const keys = await cache.keys();
          return keys.map((request) => request.url);
        }, expectedCacheName);
        expect(cacheEntries).to.have.members([
          `${global.baseUrl}common.css`,
          `${global.baseUrl}step1.html`,
          `${global.baseUrl}step2.html`,
        ]);
      });

      it('should use a different cache when an existing manifest is updated', async function() {
        global.manifestVersion = 2;
        await page.goto(`${global.baseUrl}step1.html`);
        await page.evaluate(async () => {
          await window.setupComplete;
        });

        const oldCacheName = 'efe1a9f22297dec3101383dea9f670a4e38d32d86e2917702b0bee26d370d459';
        const newCacheName = '3656ff69894c958b6be485f40a92f436b2aeabb3192ddff5159d97209f50feb8';

        const caches = await page.evaluate(() => caches.keys());
        expect(caches).to.have.members([oldCacheName, newCacheName]);

        const cacheEntries = await page.evaluate(async (newCacheName) => {
          const cache = await caches.open(newCacheName);
          const keys = await cache.keys();
          return keys.map((request) => request.url);
        }, newCacheName);
        expect(cacheEntries).to.have.members([
          `${global.baseUrl}common.css`,
          `${global.baseUrl}step1.html`,
          `${global.baseUrl}step2.html`,
        ]);
      });

      it('should use a different cache when a different manifest is used', async function() {
        await page.goto(`${global.baseUrl}step4.html`);
        await page.evaluate(async () => {
          await window.setupComplete;
        });

        const oldCacheName = '3656ff69894c958b6be485f40a92f436b2aeabb3192ddff5159d97209f50feb8';
        const newCacheName = '40468bed94b0c172081eb8f2e1e311a5a3e0ef25abe8358338f8fc905ce0cb08';

        const caches = await page.evaluate(() => caches.keys());
        expect(caches).to.include(oldCacheName);
        expect(caches).to.include(newCacheName);

        const cacheEntries = await page.evaluate(async (newCacheName) => {
          const cache = await caches.open(newCacheName);
          const keys = await cache.keys();
          return keys.map((request) => request.url);
        }, newCacheName);
        expect(cacheEntries).to.have.members([
          `${global.baseUrl}common.css`,
          `${global.baseUrl}step4.html`,
        ]);
      });
    });
  }

  run();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
