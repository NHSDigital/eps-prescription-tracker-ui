import cf from "cloudfront"
const kvsId = "KVS_ID_PLACEHOLDER"
const keyValueStore = cf.kvs(kvsId)

async function handler(event) {
  const path = await keyValueStore.get("path")
  const request = event.request
  const requestUri = request.uri
  const [, uri] = requestUri.split(path)
  request.uri = uri
  return request
}

export {handler}
