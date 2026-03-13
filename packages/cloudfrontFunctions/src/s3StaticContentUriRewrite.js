export async function handler(event) {
  const request = event.request
  const requestUri = request.uri
  const parts = requestUri.split("/site")
  const uri = parts[1]

  if (uri.includes(".")){
    request.uri = `/${uri}`
  } else {
    request.uri = `/index.html`
  }

  return request
}
