export const handler = async (event) => {
  const response = event.response
  response.statusCode = 404
  response.statusDescription = "Not Found"
  return response
}
