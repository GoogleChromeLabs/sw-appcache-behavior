const express = require('express');
const path = require('path');

const PORT = 8080;

global.manifestVersion = 0;
global.baseUrl = `http://localhost:${PORT}/puppeteer-tests/static/`;

const app = express();

app.use(express.static(path.resolve(__dirname, '..')));

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

module.exports = app.listen(PORT);
