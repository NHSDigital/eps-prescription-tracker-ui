import cf from "cloudfront"
const kvsId = "KVS_ID_PLACEHOLDER"
const keyValueStore = cf.kvs(kvsId)

const versionPattern = /v\d*\.\d*\.\d*/g
const prPattern = /pr-\d*/g

export async function handler(event) {
  const currentVersion = await keyValueStore.get("VERSION_PLACEHOLDER")
  const basePath = await keyValueStore.get("BASEPATH_PLACEHOLDER")

  const request = event.request
  const requestUri = request.uri
  const parts = requestUri.split(basePath)
  const uri = parts[1]

  const versionMatches = uri.match(versionPattern)
  const prMatches = uri.match(prPattern)

  let originUri
  let version
  let remaining_uri
  if (versionMatches && versionMatches.length === 1){
    version = versionMatches[0]
    remaining_uri = uri.split(versionMatches[0])[1]
  } else if (prMatches && prMatches.length === 1) {
    version = prMatches[0]
    remaining_uri = uri.split(prMatches[0])[1]
  } else {
    version = currentVersion
    remaining_uri = uri
  }

  if (!remaining_uri.startsWith("/") && remaining_uri !== "") {
    originUri = "/404.html"
  } else if (remaining_uri.includes(".")){
    originUri = `/${version}${remaining_uri}`
  } else {
    originUri = `/${version}/index.html`
  }
  request.uri = originUri

  return request
}
