import "@testing-library/jest-dom"
import scssModule from "../__mocks__/searchforaprescription.scss"

describe("searchforaprescription.scss mock", () => {
  it("exports an empty object for SCSS imports", () => {
    expect(scssModule).toEqual({})
    expect(typeof scssModule).toBe("object")
  })
})
