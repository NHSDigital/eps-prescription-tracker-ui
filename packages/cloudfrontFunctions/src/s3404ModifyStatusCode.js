async function handler(event) {
  const response = event.response
  response.statusCode = 404
  response.statusDescription = "Not Found"
  return response
}

export {handler}
