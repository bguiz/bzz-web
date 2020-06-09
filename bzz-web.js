const url = require('url');

const {
  pathRegex,
  errorResponseAsText,
  redirectResponse,
  makeProxyRequest,
} = require('./util.js');

const {
  convertPathToEntry,
} = require('./manifests.js');

async function handleRequest(req, res) {
  const reqUrl = url.parse(req.url);
  // console.log(reqUrl);
  const match = reqUrl.pathname.match(pathRegex);
  if (!match) {
    return errorResponseAsText(res, 404, reqUrl.pathname, 'Invalid path');
  }
  let [, protocol, hash, subPath] = match;
  // console.log({ protocol, hash, subPath, reqUrlPathName: reqUrl.pathname });
  if (protocol === 'bzz-web') {
    // convert the path, which is the main function of this proxy
    const bzzEntry = await convertPathToEntry(hash, subPath);
    if (!bzzEntry) {
      return errorResponseAsText(res, 404, reqUrl.pathname, 'Not found');
    }
    if (
      !subPath ||
      (
        bzzEntry.contentType &&
        bzzEntry.contentType.startsWith('text/html') &&
        !subPath.endsWith('.html') &&
        subPath.slice(subPath.length - 1) !== '/'
      )
    ) {
      // NOTE special handling to enforce trailing / for
      const redirectPath = reqUrl.pathname + '/';
      return redirectResponse(res, redirectPath);
    }
    // NOTE need to explicitly override Content-Type header with value
    // from its manifest entry because the Swarm router does not
    // detect the content type correctly when served by a
    // direct hash to file, as opposed to root hash plus subPath/

    // proxy the converted path with the contents from the bzz:/ path
    // console.log('bzzEntry', bzzEntry);
    const proxyReq = makeProxyRequest(
      res,
      `/bzz-raw:/${bzzEntry.hash}`,
      {
        'content-type': bzzEntry.contentType,
      },
    );
    req.pipe(proxyReq, {
      end: true,
    });
    return;
  }
  if (protocol === 'bzz' ||
      protocol === 'bzz-raw') {
    // redirect to bzz-web:/ url
    const redirectPath = reqUrl.pathname
      .replace(/^\/bzz(-raw)?/, '/bzz-web');
    // console.log('redirectPath', redirectPath);
    return redirectResponse(res, redirectPath);
  }
  return errorResponseAsText(res, 404, reqUrl.pathname, 'Not found');
}

module.exports = {
  handleRequest,
};
