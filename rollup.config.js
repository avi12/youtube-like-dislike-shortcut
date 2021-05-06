import { terser } from "rollup-plugin-terser";

const isProduction = !process.env.ROLLUP_WATCH;

function createConfig(filename) {
  return {
    input: `src/scripts/${filename}.js`,
    output: {
      format: "iife",
      file: `dist/build/${filename}.js`
    },
    plugins: [isProduction && terser()]
  };
}

export default [
  createConfig("content-script-youtube-rate-trigger")
];
