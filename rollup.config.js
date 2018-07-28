import pkg from './package.json';

import typescript from 'rollup-plugin-typescript2';

const typesciptOptions = {
  tsconfigOverride: {
    compilerOptions: {
      module: 'es2015',
      inlineSources: false,
    },
  },
};

export default [
  {
    input: 'src/index.ts',
    output: {
      name: 'eenext.EventEmitter',
      file: pkg.browser,
      format: 'umd',
    },
    plugins: [typescript(typesciptOptions)],
  },
  {
    input: 'src/index.ts',
    output: [{file: pkg.main, format: 'cjs'}, {file: pkg.module, format: 'es'}],
    plugins: [typescript(typesciptOptions)],
  },
];
