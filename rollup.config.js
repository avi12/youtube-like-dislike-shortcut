import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

const isProduction = !process.env.ROLLUP_WATCH;

function createConfig(filename) {
  return {
    input: `src/scripts/${filename}.ts`,
    output: {
      format: "cjs",
      file: `dist/build/${filename}.js`
    },
    plugins: [typescript(), isProduction && terser()],
    watch: {
      clearScreen: true
    }
  };
}

export default [createConfig("content-script-youtube-rate-trigger")];
