import cf from "cloudfront"
const kvsId = "KVS_ID_PLACEHOLDER"
const keyValueStore = cf.kvs(kvsId)

async function handler(event) {
  const s3object = keyValueStore.get("object")
  const request = event.request
  request.uri = `/${s3object}`
  return request
}

export {handler}
