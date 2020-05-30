#! /usr/bin/env node
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const lighthouse = require('lighthouse');
const lighthouseKeys = require('./lighthouseKeys.json');
const log = require('lighthouse-logger');
const yargs = require('yargs');

type Chrome = {
  kill: () => Promise<{}>;
  port?: number;
};

type Options = {
  chromeFlags?: string;
  logLevel?: string;
  port?: number;
};

type Results = {
  lhr?: {};
  report?: {};
};

const options = yargs
  .usage('Usage: -d <depth> -e <endpoints>')
  .option('e', {
    alias: 'endpoints',
    describe: 'comma-separated list of endpoints',
    type: 'string',
    demandOption: true,
  })
  .option('d', {
    alias: 'depth',
    describe: 'number of lighthouse audits per endpoint',
    type: 'number',
  })
  .argv;

const {
  endpoints,
  depth = 1,
} = options;

const dir = './reports';
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const hyphenateString = (str: string) =>
  str.replace(/(\/|\s|:)/g,'-')
     .replace(',','')
     .replace(/-{2,}/g, '-');

const runLighthouse = async (name: string, url: string, opts: Options, config: {}) => {
  const chrome = await chromeLauncher.launch({ chromeFlags: opts.chromeFlags });

  opts.port = chrome.port;
  const results = await lighthouse(url, opts, config);

  await chrome.kill();

  const filename = hyphenateString(`${name}-${new Date().toLocaleString()}.json`);
  await fs.writeFileSync(`./reports/${filename}`, results.report);
};

const flags = {
  logLevel: 'info',
};
log.setLevel(flags.logLevel);

const config = {
  extends: 'lighthouse:default',
  settings: {
    emulatedFormFactor: 'desktop',
    onlyCategories: ['performance'],
  },
};

const runLighthousePerEndpoint = async (endpoints: string) => {
  const endpointArr = endpoints.split(',');
  const nameList = {};

  console.log('\nInitializing...\n');

  for (let index = 0; index < depth; index++) {
    for (const endpoint of endpointArr) {
      const name = hyphenateString(endpoint);
      nameList[name] = [];
      await runLighthouse(name, endpoint, flags, config);

      console.log(`\n\x1b[37mPass ${index + 1} of \x1b[32m${endpoint} \x1b[37mfinished.\n`);
    }
  }
  generateReport(nameList);
};

const generateReport = async (names: {}) => {

  const files = await fs.readdirSync(dir);

  Object.keys(names).forEach(key => {
    for (const file of files) {
      if (file.includes(key)) names[key].push(file);
    }
  });

  console.log(names);
  console.log(lighthouseKeys);

  // for (const [key, value] of Object.entries(numericValueKeys)) {
  //   let metricArr = [];


  // }

  // for (let [key, value] of Object.entries(numericValueKeys)) {
  //   let metricArr = [];

  //   Object.keys(names).forEach(group => {
  //     for (const file of group) {
  //       const contents = await fs.readFileSync(`./reports/${file}`);
  //       metricArr.push(contents.audits[key].numericValue);
  //     }
  //   }
  // }

  // for (let [key, value] of Object.entries(numericValueKeys)) {
  //   let arr = [];

  //   for (item of contentArr) arr.push(item.audits[key].numericValue);

  //   const average = getAverage(arr);
  //   report[metricName][key] = average;
  //   console.log(`\x1b[37m> ${value}: \x1b[32m${getAverage(arr)}`);
  // }

  // for (let [key, value] of Object.entries(diagnosticsKeys)) {
  //   let arr = [];

  //   for (item of contentArr) arr.push(item.audits.diagnostics.details.items[0][key]);

  //   const average = getAverage(arr);
  //   report[metricName][key] = average;
  //   console.log(`\x1b[37m> ${value}: \x1b[32m${average}`);
  // }
};

runLighthousePerEndpoint(endpoints);