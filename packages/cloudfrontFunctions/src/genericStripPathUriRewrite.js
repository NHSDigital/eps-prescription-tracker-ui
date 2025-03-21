import cf from "cloudfront"
const kvsId = "KVS_ID_PLACEHOLDER"
const keyValueStore = cf.kvs(kvsId)

export async function handler(event) {
  const path = await keyValueStore.get("PATH_PLACEHOLDER")
  const request = event.request
  const requestUri = request.uri
  const parts = requestUri.split(path)
  request.uri = parts[1]
  return request
}
