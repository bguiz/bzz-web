#!/usr/bin/env node

const http = require('http');

const PORT =
  process.env.PORT || 8511;

const {
  handleRequest,
} = require('./bzz-web.js');

async function runBzzWebFromCli() {
  process.stdout.write(`http://localhost:${PORT}\n`);
  http
    .createServer(handleRequest)
    .listen(PORT);
}

runBzzWebFromCli();