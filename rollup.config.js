import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'packages/appcache-polyfill-window/index.ts',
  plugins: [
    resolve(),
    typescript(),
  ],
  output: [{
    file: 'packages/appcache-polyfill-window/build/index.js',
    format: 'iife'
  }]
};
