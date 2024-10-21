import cf from "cloudfront"
const kvsId = "KVS_ID_PLACEHOLDER"
const keyValueStore = cf.kvs(kvsId)

const versionPattern = /v\d*\.\d*\.\d*/g
const prPattern = /pr-\d*/g

async function handler(event) {
  const currentVersion = await keyValueStore.get("version")

  const request = event.request
  const requestUri = request.uri
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ignore, uri] = requestUri.split("/site")

  const versionMatches = uri.match(versionPattern)
  const prMatches = uri.match(prPattern)

  let version
  if (versionMatches && versionMatches.length === 1){
    version = versionMatches[0]
  } else if (prMatches && prMatches.length === 1) {
    version = prMatches[0]
  } else {
    version = currentVersion
  }

  let originUri
  if (uri.endsWith("/")) {
    originUri = `/${version}/index.html`
  } else {
    if (version === currentVersion) {
      originUri = `/${version}${uri}`
    } else {
      originUri = uri
    }
  }
  request.uri = originUri

  return request
}

export {handler}
