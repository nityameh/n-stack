// Entry point for the bin/ shims: `node lib/main.cjs <command> [args...]`.
// CommonJS so the shims can start it with a plain path; it then loads the ESM CLI.
// __dirname is a native path here (C:\... on Windows), so pathToFileURL is always valid.
const { pathToFileURL } = require('url');
const path = require('path');

const [command, ...args] = process.argv.slice(2);
import(pathToFileURL(path.join(__dirname, 'cli.mjs')).href)
  .then((m) => m.run(command, args))
  .catch((e) => { console.error(e.message); process.exit(1); });
