export const handler = async (event) => {
  const request = event.request
  request.uri = "/404.html"
  return request
}
