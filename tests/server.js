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

const express = require('express');
const path = require('path');

const RequestCounter = require('./RequestCounter');

const PORT = 8080;

global.baseUrl = `http://localhost:${PORT}/tests/static/`;
global.manifestVersion = 0;
global.requestCounter = new RequestCounter();

const app = express();

app.use((req, res, next) => {
  global.requestCounter.increment(req.url);
  next();
});

app.use(express.static(path.resolve(__dirname, '..'), {
  etag: false,
  lastModified: false,
}));

app.set('views', path.join(__dirname, 'templates'));

app.get('/*.appcache', (req, res) => {
  if (global.forceManifestStatuss) {
    res.sendStatus(global.forceManifestStatus);
  } else {
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
  }
});

module.exports = app.listen(PORT);
