import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import css from "rollup-plugin-css-only";
import typescript from "@rollup/plugin-typescript";
import sveltePreprocess from "svelte-preprocess";
import scss from "rollup-plugin-scss";

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
    watch: { clearScreen: true }
  };
}

function createConfigCss(filename) {
  const destForRollup = `dist/build/styles/${filename}.css`;
  return {
    input: `src/styles/${filename}.scss`,
    output: {
      file: destForRollup
    },
    plugins: [
      scss({
        output: `dist/build/styles/${filename}.min.css`,
        outputStyle: "compressed"
      })
    ],
    watch: { clearScreen: true }
  };
}

export default [
  createConfig("scripts/content-script-youtube-rate-trigger"),
  createConfig("popup/popup", true),
  createConfigCss("styles-youtube-rate")
];
