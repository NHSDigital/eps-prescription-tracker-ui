
import {handler} from "../src/genericS3FixedObjectUriRewrite"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("Generic Strip Path S3 URI Rewrite", () => {

  const testCases = [
    {
      description: "Path root",
      requestUri: "/example/",
      expectedOriginUri: "/file.ext"
    },
    {
      description: "Invalid nested path",
      requestUri: "/example/invalid_subpath/",
      expectedOriginUri: "/file.ext"
    },
    {
      description: "Path with specified file",
      requestUri: "/example/file.ext",
      expectedOriginUri: "/file.ext"
    }
  ]

  testCases.forEach(({description, requestUri, expectedOriginUri}) => {
    it(description, async() => {
      const mockEvent = {
        request: {
          method: "GET",
          uri: requestUri
        }
      }
      const result: any = await handler(mockEvent)
      expect(result.uri).toEqual(expectedOriginUri)
    })
  })
})
