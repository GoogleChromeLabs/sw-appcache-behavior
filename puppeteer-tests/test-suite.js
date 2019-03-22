require('./bootstrap');

const {expect} = require('chai');

describe('End-to-End Tests', function() {
  let page;
  let context;

  before(async function() {
    context = await global.browser.createIncognitoBrowserContext();
    page = await global.browser.newPage();
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

  after(async function() {
    await context.close();
  });

  it('should create the initial cache entries', async function() {
    global.manifestVersion = 1;
    await page.goto(`${global.baseUrl}step1.html`);
    await page.evaluate(async () => {
      await window.setupComplete;
    });

    const expectedCacheName = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';

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
    global.manifestVersion = 1;
    await page.goto(`${global.baseUrl}step2.html`);
    await page.evaluate(async () => {
      await window.setupComplete;
    });

    const expectedCacheName = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';

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
    global.manifestVersion = 1;
    await page.goto(`${global.baseUrl}step3.html`);
    await page.evaluate(async () => {
      await window.setupComplete;
    });

    const expectedCacheName = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';

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

    const expectedCacheName = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';

    const caches = await page.evaluate(() => caches.keys());
    expect(caches).to.have.members([expectedCacheName]);

    const cacheEntries = await page.evaluate(async (expectedCacheName) => {
      const cache = await caches.open(expectedCacheName);
      const keys = await cache.keys();
      return keys.map((request) => request.url);
    }, expectedCacheName);
    expect(cacheEntries).to.have.members([]);
  });
});
