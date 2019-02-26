import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

const packages = [
  'appcache-polyfill-sw',
  'appcache-polyfill-window',
];

const config = packages.map((pkg) => {
  return {
    input: `packages/${pkg}/index.ts`,
    plugins: [
      resolve(),
      typescript({
        tsconfig: `packages/${pkg}/tsconfig.json`,
      }),
    ],
    output: [{
      file: `packages/${pkg}/build/index.js`,
      format: 'iife',
      name: 'appcachePolyfill',
    }],
  };
});

export default config;
