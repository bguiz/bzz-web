// TODO remove this dependency,
// as it is only used for a promisified HTTP GET.
// Use `http` directly instead.
const axios = require('axios');

const {
  BZZ_HOST,
  BZZ_PORT,
} = require('./config.js');

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
  try {
    manifest = (await axios.get(manifestPath)).data;
  } catch (ex) {
    console.error('getManifest failure:', manifestPath);
    console.error(ex);
    throw ex;
  }
  // console.log('manifest', hash, manifest);
  manifests.set(hash, manifest);
  return manifest;
}

// TODO replace with LRU cache, lest we leak memory over time
const manifests = new Map(); // Map<Hash, Manifest>

module.exports = {
  convertPathToEntry,
  getEntryOfSubPath,
  getEntryOfSubPathInner,
  getManifest,
  manifests,
};
