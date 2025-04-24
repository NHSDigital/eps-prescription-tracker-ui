import {AxiosResponseHeaders, RawAxiosResponseHeaders} from "axios"

/**
 * Formats Axios headers to ensure values are stringified
 * @param headers - Axios response headers
 * @returns Formatted headers
*/
function formatHeaders(
  headers: AxiosResponseHeaders | Partial<RawAxiosResponseHeaders>
): {[header: string]: string} {
  const formattedHeaders: {[header: string]: string} = {}

  // Ensure each value is converted to a string
  for (const [key, value] of Object.entries(headers)) {
    formattedHeaders[key] = String(value)
  }

  return formattedHeaders
}

export {formatHeaders}
