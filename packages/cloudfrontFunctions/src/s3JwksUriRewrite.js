export const handler = async (event) => {
  const request = event.request
  request.uri = "/jwks.json"
  return request
}
