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

  beforeEach(function() {
    global.manifestVersion = 1;
  });

  after(async function() {
    await context.close();
  });

  it('should create the initial cache entries', async function() {
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

    const oldCacheName = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';
    const newCacheName = 'dcd6e81823b2ca75e46833f31be4fcc129199c335e74d6335ca519389d100e14';

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

    const oldCacheName1 = '77ce9d3f83f948060a3ae0031f7ed56dc8438f659d6736dd46b33c6c7590b9bb';
    const oldCacheName2 = 'dcd6e81823b2ca75e46833f31be4fcc129199c335e74d6335ca519389d100e14';
    const newCacheName = '4c0209fea7a7efd3d1cde60579e361ea06b4661735520a2be526b05a259d60ca';

    const caches = await page.evaluate(() => caches.keys());
    expect(caches).to.have.members([oldCacheName1, oldCacheName2, newCacheName]);

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
