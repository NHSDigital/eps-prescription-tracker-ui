import {renderHook} from "@testing-library/react"
import {usePageTitle} from "@/hooks/usePageTitle"

describe("usePageTitle", () => {
  const originalTitle = document.title

  afterEach(() => {
    // Reset document title after each test
    document.title = originalTitle
  })

  it("sets the document title when hook is called", () => {
    const testTitle = "Test Page Title"

    renderHook(() => usePageTitle(testTitle))

    expect(document.title).toBe(testTitle)
  })

  it("updates the document title when title changes", () => {
    const initialTitle = "Initial Title"
    const updatedTitle = "Updated Title"

    const {rerender} = renderHook(
      ({title}) => usePageTitle(title),
      {
        initialProps: {title: initialTitle}
      }
    )

    expect(document.title).toBe(initialTitle)

    rerender({title: updatedTitle})

    expect(document.title).toBe(updatedTitle)
  })

  it("handles empty string title", () => {
    const emptyTitle = ""

    renderHook(() => usePageTitle(emptyTitle))

    expect(document.title).toBe(emptyTitle)
  })

  it("handles special characters in title", () => {
    const specialTitle = "Page - Error: Something went wrong! (404)"

    renderHook(() => usePageTitle(specialTitle))

    expect(document.title).toBe(specialTitle)
  })

  it("does not change title when hook is called with same title multiple times", () => {
    const testTitle = "Consistent Title"

    const {rerender} = renderHook(() => usePageTitle(testTitle))

    expect(document.title).toBe(testTitle)

    // Re-render with same title
    rerender()
    rerender()
    rerender()

    expect(document.title).toBe(testTitle)
  })
})
