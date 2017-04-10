/*
 Copyright 2016 Google Inc. All Rights Reserved.
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
const gulp = require('gulp');
const promisify = require('promisify-node');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const path = require('path');
const {buildJSBundle} = require('../utils/build');

const fsePromise = promisify('fs-extra');

gulp.task('build', () => {
  const buildDir = `build`;

  // Copy over package.json and README.md so that build/ contains what we
  // need to publish to npm.
  return fsePromise.emptyDir(buildDir)
    .then(() => {
      return Promise.all([
        buildJSBundle({
          rollupConfig: {
            entry: path.join(__dirname, '..', 'src', 'client-runtime.js'),
            format: 'umd',
            plugins: [
              resolve({
                jsnext: true,
                main: true,
                browser: true,
              }),
              commonjs(),
            ],
          },
          buildPath: 'build/client-runtime.js',
          projectDir: path.join(__dirname, '..'),
        }),
        buildJSBundle({
          rollupConfig: {
            entry: path.join(__dirname, '..', 'src',
              'appcache-behavior-import.js'),
            format: 'umd',
            moduleName: 'goog.appCacheBehavior',
            plugins: [
              resolve({
                jsnext: true,
                main: true,
                browser: true,
              }),
              commonjs(),
            ],
          },
          buildPath: 'build/appcache-behavior-import.js',
          projectDir: path.join(__dirname, '..'),
        }),
      ]);
    });
});

gulp.task('build:watch', ['build'], (unusedCallback) => {
  gulp.watch(`src/**/*`, ['build']);
});