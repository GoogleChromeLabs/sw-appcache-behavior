import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/window-runtime.ts',
  plugins: [
    resolve(),
    typescript(),
  ],
  output: [{
    file: 'dist/window-runtime.js',
    format: 'iife'
  }]
};
