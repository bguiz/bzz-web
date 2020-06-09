const http = require('http');

const {
  BZZ_HOST,
  BZZ_PORT,
} = require('./config.js');

const pathRegex =
  /^\/(bzz|bzz-raw|bzz-web)\:\/([\w\d]{64})(\/.*)?$/;

const proxyAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 60e3,
  timeout: 10e3,
});

function errorResponseAsText(res, code, path, msg) {
  res.writeHead(
    code,
    {
      'Content-Type': 'text/plain',
    },
  );
  res.write(
    `${code} ${msg} - ${path}\n`,
  );
  res.end();
  return;
}

function redirectResponse(res, redirectPath) {
  res.writeHead(
    307, // temporary redirect explicitly chosen over 301 permanent redirect
    {
      Location: redirectPath,
    },
  );
  res.end();
  return;
}

function makeProxyRequest(res, path, headerOverrides = {}) {
  return http.request({
    agent: proxyAgent,
    host: BZZ_HOST,
    port: BZZ_PORT,
    path,
  }, function (proxyRes) {
    const customHeaders = {
      ...proxyRes.headers,
      ...headerOverrides,
    };
    // console.log(proxyRes.headers);
    // console.log(customHeaders);
    res.writeHead(
      proxyRes.statusCode,
      customHeaders,
    );
    proxyRes.pipe(res, {
      end: true,
    });
  });
}

module.exports = {
  pathRegex,
  proxyAgent,
  errorResponseAsText,
  redirectResponse,
  makeProxyRequest,
};
