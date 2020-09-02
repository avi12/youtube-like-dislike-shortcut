"use strict";

const fs = require("fs-extra");
const recursive = require("recursive-readdir");

const Terser = require("terser");
const babel = require("@babel/core");

const htmlMinifier = require("html-minifier");
const ssri = require("ssri");

const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano")({
  preset: [
    "default",
    {
      zindex: false,
      svgo: false,
      autoprefixer: true
    }
  ]
});

const isMinify = process.argv.includes("--minify");

const postcss = require("postcss");
const postcssPlugins = [autoprefixer];
if (isMinify) {
  postcssPlugins.push(cssnano);
}
const postcssProcess = postcss(postcssPlugins);

const distDir = "dist";
const srcDir = "src";

function mutateFile(file, method) {
  return fs
    .readFile(file, "utf8")
    .then(fileContent => method(fileContent))
    .then(result => fs.writeFile(file, result, "utf8"));
}

function getSsri(filePath) {
  const fileData = fs.readFileSync(filePath, "utf8");
  return ssri
    .fromData(fileData, {
      algorithms: ["sha384"]
    })
    .toString();
}

async function addIntegrities(fileContent) {
  return fileContent.replace(
    /data-integrity-src=["']([^"']+)["']/g,
    (match, filename) => {
      const filePath = distDir + "/" + filename;
      const hash = getSsri(filePath);
      return `integrity="${hash}"`;
    }
  );
}

async function processHtml(fileContent) {
  fileContent = await addIntegrities(fileContent);
  if (!isMinify) {
    return fileContent;
  }

  return htmlMinifier.minify(fileContent, {
    caseSensitive: true,
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    decodeEntities: true,
    html5: true,
    includeAutoGeneratedTags: true,
    keepClosingSlash: false,
    maxLineLength: 500,
    minifyCSS: true,
    minifyJS: true,
    preserveLineBreaks: false,
    preventAttributesEscaping: false,
    processConditionalComments: true,
    quoteCharacter: '"',
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: false,
    removeEmptyElements: false,
    removeOptionalTags: false,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: false,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true
  });
}

function processAndMutate(files, ext, func) {
  const matchedFiles = files.filter(file => file.endsWith(ext));
  const promises = matchedFiles.map(file => {
    return mutateFile(file, func);
  });
  return Promise.all(promises);
}

function processJs(fileContent) {
  const js = babel.transformSync(fileContent, {
    cwd: distDir
  }).code;

  if (!isMinify) {
    return js;
  }
  return Terser.minify(js, {
    output: {
      comments: false
    },
    toplevel: true
  }).code;
}

function processCss(fileContent) {
  return postcssProcess
    .process(fileContent, {
      from: undefined
    })
    .then(result => result.css);
}

function processJson(fileContent) {
  if (!isMinify) {
    return fileContent;
  }
  try {
    return JSON.stringify(JSON.parse(fileContent));
  } catch {
    return fileContent;
  }
}

async function processFiles() {
  const files = await recursive(distDir);

  Promise.all([
    processAndMutate(files, ".js", processJs),
    processAndMutate(files, ".css", processCss),
    processAndMutate(files, ".json", processJson)
  ]).then(() => processAndMutate(files, ".html", processHtml));
}

function cleanAndCopy() {
  fs.removeSync(distDir);
  fs.copySync(srcDir, distDir);
}

async function build() {
  console.log("Building...");
  cleanAndCopy();
  await processFiles();
}

build().catch(console.error);
