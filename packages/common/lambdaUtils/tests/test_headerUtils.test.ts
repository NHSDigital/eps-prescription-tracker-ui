import {headers} from "@cpt-ui-common/lambdaUtils"
const formatHeaders = headers.formatHeaders

describe("formatHeaders tests", () => {
  it("should convert header values to strings", () => {
    const headers = {
      "content-type": "application/json",
      "x-custom-header": 12345
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "content-type": "application/json",
      "x-custom-header": "12345"
    })
  })

  it("should handle empty headers object", () => {
    const headers = {}

    const result = formatHeaders(headers)
    expect(result).toEqual({})
  })

  it("should convert null or undefined values to strings", () => {
    const headers = {
      "x-null-header": null,
      "x-undefined-header": undefined
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "x-null-header": "null",
      "x-undefined-header": "undefined"
    })
  })

  it("should convert numeric values to strings", () => {
    const headers = {
      "x-numeric-header": 123,
      "x-float-header": 45.67
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "x-numeric-header": "123",
      "x-float-header": "45.67"
    })
  })

  it("should convert boolean values to strings", () => {
    const headers = {
      "x-boolean-true": true,
      "x-boolean-false": false
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "x-boolean-true": "true",
      "x-boolean-false": "false"
    })
  })

  it("should handle non-standard header names", () => {
    const headers = {
      "X-Custom-Header": "CustomValue",
      "Another-Header": 789
    }

    const result = formatHeaders(headers)
    expect(result).toEqual({
      "X-Custom-Header": "CustomValue",
      "Another-Header": "789"
    })
  })
})
