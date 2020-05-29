#! /usr/bin/env node
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const lighthouse = require('lighthouse');
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
  .usage(
    'Usage: -d <depth> -e <endpoint1> -f <endpoint2> -g <endpoint3> -h <endpoint4> -i <endpoint5>'
  )
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

const runLighthouse = async (url: string, opts: Options, config: {}) => {
  return chromeLauncher
    .launch({ chromeFlags: opts.chromeFlags })
    .then((chrome: Chrome) => {
      opts.port = chrome.port;
  const results = await lighthouse(url, opts, config);

  await chrome.kill();

  const filename = `audit-${new Date().toLocaleString()}.json`
    .replace(/(\/|\s|:)/g,'-').replace(',','');
    
              fs.writeFile(`./reports/${filename}`, results.report, (err: Error) => {
                if (err) throw err;
                console.log(`\n\x1b[32mAudit written to file\x1b[37m: ${filename}\n`);
              });
              return;
            });
      });
  })
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

  for (let index = 0; index < depth; index++) {
    for (const endpoint of endpointArr) {
      await runLighthouse(endpoint, flags, config);
      console.log(`\n\x1b[32mPass ${index + 1} of endpoint finished\x1b[37m: ${endpoint}\n`);
    }
  }
  console.log('finally!');
};

runLighthousePerEndpoint(endpoints);