import {formatHeaders} from "../src/utils/headerUtils"

describe("formatHeaders", () => {
  it("should return an empty object when given an empty object", () => {
    expect(formatHeaders({})).toEqual({})
  })

  it("should keep string values unchanged", () => {
    const input = {"content-type": "application/json"}
    const expected = {"content-type": "application/json"}
    expect(formatHeaders(input)).toEqual(expected)
  })

  it("should convert number and boolean header values to strings", () => {
    const input = {
      "content-length": 123,
      "cache-control": false
    }
    const expected = {
      "content-length": "123",
      "cache-control": "false"
    }
    expect(formatHeaders(input)).toEqual(expected)
  })

  it("should handle array values by converting them to a comma-separated string", () => {
    const input = {
      "set-cookie": ["cookie1", "cookie2"]
    }
    const expected = {
      "set-cookie": "cookie1,cookie2"
    }
    expect(formatHeaders(input)).toEqual(expected)
  })

  it("should handle null and undefined values by converting them to strings", () => {
    const input = {
      "null-header": null,
      "undefined-header": undefined
    }
    const expected = {
      "null-header": "null",
      "undefined-header": "undefined"
    }
    expect(formatHeaders(input)).toEqual(expected)
  })
})
