export async function handler(event) {
  const request = event.request
  const uri = request.uri

  // Don't redirect /site specifically
  if (uri.startsWith("/site")) {
    return request
  }

  // Redirect to /site if
  if (uri === ("/")) {
    return {
      statusCode: 302,
      statusDescription: "Found",
      headers: {
        location: {
          value: "/site"
        }
      }
    }
  }

  // Single segement path, redirect to /site/uri
  const singleSegmentRegex = /^\/[^/]+$/
  if (singleSegmentRegex.test(uri)) {
    return {
      statusCode: 302,
      statusDescription: "Found",
      headers: {
        location: {
          value: "/site" + uri
        }
      }
    }
  }

  // Handle the request by other behaviour if it's multi-segment ie. /foo/bar
  return request
}
