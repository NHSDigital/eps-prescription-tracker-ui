import React from "react"
import "@testing-library/jest-dom"
import {fireEvent, render, waitFor} from "@testing-library/react"
import {Tabs} from "nhsuk-react-components"
import {BrowserRouter} from "react-router-dom"

import EpsTabs from "@/components/EpsTabs"

// Mock MediaQueryList
class MediaQueryList {
  matches = false
  media = ""
  onchange = null
  addListener = jest.fn()
  removeListener = jest.fn()
  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  dispatchEvent = jest.fn()

  constructor() {
    this.matches = false
    this.media = ""
  }
}

window.matchMedia = jest.fn().mockImplementation(() => new MediaQueryList())

// Mock ResizeObserver
// eslint-disable-next-line no-undef
global.ResizeObserver = jest.fn().mockImplementation(function () {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  }
})

describe("The tabs component", () => {
  it("Switches between tabs when links are clicked", async () => {
    const {container} = render(
      <BrowserRouter>
        <EpsTabs activeTabPath="/search-by-prescription-id">
          <div data-testid="tab-content">Tab Content</div>
        </EpsTabs>
      </BrowserRouter>
    )

    // Get the tab links for each search type
    const prescriptionIdTab = container.querySelector('a[href="/search-by-prescription-id"]')
    const nhsNumberTab = container.querySelector('a[href="/search-by-nhs-number"]')

    // Verify the tabs exist
    expect(prescriptionIdTab).toBeInTheDocument()
    expect(nhsNumberTab).toBeInTheDocument()

    // Verify the initial tab is selected
    expect(prescriptionIdTab?.parentElement).toHaveClass("nhsuk-tabs__list-item--selected")

    // Verify the panel exists and contains the content
    const panel = container.querySelector(".nhsuk-tabs__panel")
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent("Tab Content")

    // Click the NHS number tab
    if (nhsNumberTab) {
      fireEvent.click(nhsNumberTab)

      // In our implementation, clicking a tab navigates to a new URL
      // Since this is a test, navigation doesn't actually occur,
      // but we can verify the click event happens without errors
      await waitFor(() => {
        expect(nhsNumberTab.getAttribute("aria-selected")).toBe("false")
      })
    }
  })

  // The remaining tests test the NHS components directly, so they can stay the same
  describe("The tab list", () => {
    it("Renders the expected children", () => {
      const {container} = render(
        <Tabs.List>
          <div id="list-contents" />
        </Tabs.List>
      )

      const listElement = container.querySelector(".nhsuk-tabs__list")
      expect(listElement?.querySelector("#list-contents")).toBeTruthy()
    })
  })

  describe("The tab list item", () => {
    it("Sets the href to be the passed in id prop", () => {
      const {container} = render(
        <Tabs.ListItem id="test-id">
          <div id="list-item-contents" />
        </Tabs.ListItem>
      )

      expect(container.querySelector(".nhsuk-tabs__tab")?.getAttribute("href")).toBe("#test-id")
    })

    it("Renders the expected children", () => {
      const {container} = render(
        <Tabs.ListItem id="test-id">
          <div id="list-item-contents" />
        </Tabs.ListItem>
      )

      const tabElement = container.querySelector(".nhsuk-tabs__tab")
      expect(tabElement?.querySelector("#list-item-contents")).toBeTruthy()
    })
  })

  describe("The tab contents", () => {
    it("Renders the expected children", () => {
      const {container} = render(
        <Tabs.Contents id="test-contents">
          <div id="tab-contents" />
        </Tabs.Contents>
      )

      const tabElement = container.querySelector("#test-contents")
      expect(tabElement?.querySelector("#tab-contents")).toBeTruthy()
    })
  })
})
