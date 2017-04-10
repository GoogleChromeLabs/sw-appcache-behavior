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

/* eslint-disable no-console, valid-jsdoc */

const babel = require('gulp-babel');
const fs = require('fs');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const header = require('gulp-header');
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');
const sourcemaps = require('gulp-sourcemaps');

const LICENSE_HEADER = fs.readFileSync('templates/LICENSE-HEADER.txt', 'utf8');

/**
 * This method will bundle JS with Rollup and then run through Babel for
 * async and await transpilation and minification with babili. This will
 * also add a license header and create sourcemaps.
 *
 * @param  {Object} options Options object with 'projectDir' and 'rollupConfig'
 * @return {Promise}
 */
function buildJSBundle(options) {
  return new Promise((resolve, reject) => {
    const outputName = options.buildPath.replace(/^build\//, '');
    const sources = [
      `${options.projectDir}/src/**/*.js`,
      '{lib,packages}/**/*.js',
      // Explicitly avoid matching node_modules/.bin/*.js
      'node_modules/*/**/*.js',
    ];

    gulp.src(sources)
      .pipe(sourcemaps.init())
      .pipe(rollup(options.rollupConfig))
      .pipe(gulpif(options.minify, babel({
        presets: [
          ['babili', {
            comments: false,
            keepFnName: true,
            keepClassName: true,
          }],
        ],
      })))
      .pipe(header(LICENSE_HEADER))
      .pipe(rename(outputName))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(`${options.projectDir}/build`))
      .on('error', reject)
      .on('end', resolve);
  });
}

module.exports = {
  buildJSBundle,
};
