import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import css from "rollup-plugin-css-only";
import typescript from "@rollup/plugin-typescript";
import sveltePreprocess from "svelte-preprocess";

const isProduction = !process.env.ROLLUP_WATCH;

function createConfig(filename, useSvelte = false) {
  return {
    input: `src/${filename}.ts`,
    output: {
      format: "cjs",
      file: `dist/build/${filename}.js`,
      sourcemap: false,
      inlineDynamicImports: true
    },
    plugins: [
      typescript(),
      useSvelte && css({ output: "popup.css" }),
      useSvelte &&
        svelte({
          compilerOptions: {
            dev: !isProduction
          },
          preprocess: sveltePreprocess()
        }),
      resolve({ dedupe: ["svelte"] }),
      commonjs(),
      isProduction && terser()
    ],
    watch: {
      clearScreen: true
    }
  };
}

function createBackgroundConfig() {
  return {
    input: "src/scripts/background.ts",
    output: {
      format: "cjs",
      file: "dist/build/scripts/background.js"
    },
    plugins: [typescript(), isProduction && terser()],
    watch: {
      clearScreen: true
    }
  };
}

export default [
  createConfig("scripts/content-script-youtube-rate-trigger"),
  createConfig("popup/popup", true),
  createBackgroundConfig()
];
