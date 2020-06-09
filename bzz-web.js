const url = require('url');

// TODO remove this dependency,
// as it is only used for a promisified HTTP GET.
// Use `http` directly instead.
const axios = require('axios');

const {
  BZZ_HOST,
  BZZ_PORT,
  pathRegex,
  errorResponseAsText,
  redirectResponse,
  makeProxyRequest,
} = require('./util.js');

async function handleRequest(req, res) {
  reqUrl = url.parse(req.url);
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

async function convertPathToEntry(hash, subPath) {
  if (!subPath) {
    subPath = '';
  }
  if (subPath.startsWith('/')) {
    subPath = subPath.slice(1);
  }
  if (subPath.endsWith('/')) {
    subPath = subPath.slice(0, subPath.length - 1);
  }
  const rootManifest = await getManifest(hash);
  const entryOfSubPath = await getEntryOfSubPath(subPath, rootManifest);
  // console.log('entryOfSubPath', subPath, entryOfSubPath);
  if (!entryOfSubPath) {
    return '';
  }
  return entryOfSubPath;
}

async function getEntryOfSubPath(subPath, manifest) {
  if (!subPath || subPath === '/') {
    subPath = '';
  }
  // console.log(`getEntryOfSubPathInner 1 '${subPath}'`);
  let entry = await getEntryOfSubPathInner(subPath, manifest);
  if (entry || subPath.endsWith('index.html')) {
    return entry;
  }
  // NOTE need for special handling for index.html files
  subPath = [subPath, 'index.html'].join('/')
  // console.log(`getEntryOfSubPathInner 2 '${subPath}'`);
  entry = await getEntryOfSubPathInner(subPath, manifest);
  return entry;
}

async function getEntryOfSubPathInner(subPath, manifest) {
  if (!Array.isArray(manifest.entries)) {
    return undefined;
  }
  for (entry of manifest.entries) {
    // console.log('entry', entry);
    let shouldRecur = false;
    if (
      (entry.path === subPath) ||
      (!entry.path && !subPath)
    ) {
      if (entry.contentType === 'application/bzz-manifest+json') {
        shouldRecur = true;
      } else {
        // direct hit
        return entry;
      }
    } else if (
      subPath.startsWith(entry.path)
    ) {
      if (entry.contentType === 'application/bzz-manifest+json') {
        shouldRecur = true;
      }
    }
    if (shouldRecur) {
      // drill down one level deeper into manifests
      subSubPath = subPath.slice(entry.path.length);
      const subManifest = await getManifest(entry.hash);
      return await getEntryOfSubPath(subSubPath, subManifest);
    }
  }
  // not found, does not exist
  return undefined;
}

async function getManifest(hash) {
  let manifest;
  manifest = manifests.get(hash);
  if (manifest) {
    return manifest;
  }
  const manifestPath = `http://${BZZ_HOST}:${BZZ_PORT}/bzz-raw:/${hash}`;
  // console.log('manifestPath', manifestPath);
  manifest = (await axios.get(manifestPath)).data;
  // console.log('manifest', hash, manifest);
  manifests.set(hash, manifest);
  return manifest;
}

// TODO replace with LRU cache, lest we leak memory over time
const manifests = new Map(); // Map<Hash, Manifest>

module.exports = {
  handleRequest,
};
