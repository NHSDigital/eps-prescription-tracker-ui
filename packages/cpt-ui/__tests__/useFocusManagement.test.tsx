import {renderHook, act, fireEvent} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import {useFocusManagement} from "@/helpers/useFocusManagement"
import "@testing-library/jest-dom"

const mockStorage: {[key: string]: string} = {}
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => mockStorage[key] = value,
    removeItem: (key: string) => delete mockStorage[key],
    clear: () => Object.keys(mockStorage).forEach(key => delete mockStorage[key])
  },
  writable: true
})

const renderHookWithRouter = (initialEntries = ["/"], hookOptions = {}) => {
  return renderHook(() => useFocusManagement(), {
    wrapper: ({children}) => (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    ),
    ...hookOptions
  })
}

describe("useFocusManagement", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key])
    document.body.innerHTML = ""

    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur?.()
    }
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("focuses skip link on first tab press without prior interaction", async () => {
    renderHookWithRouter()

    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    skipLink.href = "#main"
    document.body.appendChild(skipLink)

    const focusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(focusSpy).toHaveBeenCalled()
  })

  it("stores input ID when user clicks on input", async () => {
    renderHookWithRouter()

    const input = document.createElement("input")
    input.id = "presc-id-input"
    document.body.appendChild(input)

    await act(async () => {
      fireEvent.click(input)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBe("presc-id-input")
  })

  it("stores input ID when user focuses on input", async () => {
    renderHookWithRouter()

    const input = document.createElement("input")
    input.id = "nhs-number-input"
    document.body.appendChild(input)

    await act(async () => {
      fireEvent.focus(input)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBe("nhs-number-input")
  })

  it("focuses stored input on tab press after interaction", async () => {
    renderHookWithRouter()

    const input = document.createElement("input")
    input.id = "patient-name"
    input.style.display = "block"
    document.body.appendChild(input)

    Object.defineProperty(input, "offsetParent", {
      value: document.body,
      writable: true
    })

    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const inputFocusSpy = jest.spyOn(input, "focus")
    const skipLinkFocusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.click(input)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBe("patient-name")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(inputFocusSpy).toHaveBeenCalled()
    expect(skipLinkFocusSpy).not.toHaveBeenCalled()
  })

  it("ignores non-input elements for storage", async () => {
    renderHookWithRouter()

    const button = document.createElement("button")
    button.id = "submit-btn"
    document.body.appendChild(button)

    await act(async () => {
      fireEvent.click(button)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBeNull()
  })

  it("handles textarea elements", async () => {
    renderHookWithRouter()

    const textarea = document.createElement("textarea")
    textarea.id = "notes-field"
    document.body.appendChild(textarea)

    await act(async () => {
      fireEvent.click(textarea)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBe("notes-field")
  })

  it("handles select elements", async () => {
    renderHookWithRouter()

    const select = document.createElement("select")
    select.id = "dropdown"
    document.body.appendChild(select)

    await act(async () => {
      fireEvent.focus(select)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBe("dropdown")
  })

  it("ignores shift+tab", async () => {
    renderHookWithRouter()

    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const focusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab", shiftKey: true})
    })

    expect(focusSpy).not.toHaveBeenCalled()
  })

  it("only handles first tab press", async () => {
    renderHookWithRouter()

    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const focusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(focusSpy).toHaveBeenCalledTimes(1)
  })

  it("finds skip link by data-testid", async () => {
    renderHookWithRouter()

    const skipLink = document.createElement("a")
    skipLink.setAttribute("data-testid", "eps_header_skipLink")
    document.body.appendChild(skipLink)

    const focusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(focusSpy).toHaveBeenCalled()
  })

  it("ignores elements without id", async () => {
    renderHookWithRouter()

    const input = document.createElement("input")
    document.body.appendChild(input)

    await act(async () => {
      fireEvent.click(input)
    })

    expect(localStorage.getItem("lastFocusedInput")).toBeNull()
  })

  it("handles element that becomes hidden after being stored", async () => {
    renderHookWithRouter()

    const input = document.createElement("input")
    input.id = "hidden-input"
    document.body.appendChild(input)

    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const skipLinkFocusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.click(input)
    })

    Object.defineProperty(input, "offsetParent", {
      value: null,
      writable: true
    })

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(skipLinkFocusSpy).toHaveBeenCalled()
  })

  it("focuses cookie banner accept button before skip link when both present without interaction", async () => {
    renderHookWithRouter()

    // Create cookie banner with accept button specifically
    const cookieBanner = document.createElement("div")
    cookieBanner.setAttribute("data-testid", "cookieBanner")

    const acceptButton = document.createElement("button")
    acceptButton.textContent = "Accept cookies"
    acceptButton.setAttribute("data-testid", "accept-button")
    cookieBanner.appendChild(acceptButton)

    // Make the cookie banner visible
    Object.defineProperty(cookieBanner, "offsetParent", {
      value: document.body,
      writable: true
    })

    document.body.appendChild(cookieBanner)

    // Create skip link
    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    skipLink.href = "#main"
    document.body.appendChild(skipLink)

    const acceptButtonFocusSpy = jest.spyOn(acceptButton, "focus")
    const skipLinkFocusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(acceptButtonFocusSpy).toHaveBeenCalled()
    expect(skipLinkFocusSpy).not.toHaveBeenCalled()
  })

  it("focuses skip link when cookie banner not visible", async () => {
    renderHookWithRouter()

    // Create cookie banner but make it hidden
    const cookieBanner = document.createElement("div")
    cookieBanner.setAttribute("data-testid", "cookieBanner")

    const acceptButton = document.createElement("button")
    cookieBanner.appendChild(acceptButton)

    // Make the cookie banner hidden (offsetParent is null)
    Object.defineProperty(cookieBanner, "offsetParent", {
      value: null,
      writable: true
    })

    document.body.appendChild(cookieBanner)

    // Create skip link
    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const buttonFocusSpy = jest.spyOn(acceptButton, "focus")
    const skipLinkFocusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(buttonFocusSpy).not.toHaveBeenCalled()
    expect(skipLinkFocusSpy).toHaveBeenCalled()
  })

  it("focuses skip link when cookie banner exists but no accept button", async () => {
    renderHookWithRouter()

    // Create cookie banner without accept button
    const cookieBanner = document.createElement("div")
    cookieBanner.setAttribute("data-testid", "cookieBanner")

    const someOtherButton = document.createElement("button")
    someOtherButton.textContent = "Other button"
    cookieBanner.appendChild(someOtherButton)

    // Make the cookie banner visible
    Object.defineProperty(cookieBanner, "offsetParent", {
      value: document.body,
      writable: true
    })

    document.body.appendChild(cookieBanner)

    // Create skip link
    const skipLink = document.createElement("a")
    skipLink.className = "nhsuk-skip-link"
    document.body.appendChild(skipLink)

    const otherButtonFocusSpy = jest.spyOn(someOtherButton, "focus")
    const skipLinkFocusSpy = jest.spyOn(skipLink, "focus")

    await act(async () => {
      fireEvent.keyDown(document, {key: "Tab", code: "Tab"})
    })

    expect(otherButtonFocusSpy).not.toHaveBeenCalled()
    expect(skipLinkFocusSpy).toHaveBeenCalled()
  })
})
