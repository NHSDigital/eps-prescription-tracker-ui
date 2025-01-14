import {formatHeaders} from "../src/helpers"

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
})
