import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"

import {NOT_FOUND_PAGE_STRINGS} from "@/constants/ui-strings/NotFoundPage"
import {FRONTEND_PATHS} from "@/constants/environment"

import NotFoundPage from "@/pages/NotFoundPage"

describe("NotFoundPage", () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
  })

  it("renders the main container with the correct id and class", () => {
    // The <main> element has an implicit role of "main"
    const mainElement = screen.getByRole("main")
    expect(mainElement).toBeInTheDocument()
    expect(mainElement).toHaveAttribute("id", "main-content")
    expect(mainElement).toHaveClass("nhsuk-main-wrapper")
  })

  it("renders the header text", () => {
    const header = screen.getByRole("heading", {level: 1})
    expect(header).toBeInTheDocument()
    expect(header).toHaveTextContent(NOT_FOUND_PAGE_STRINGS.headerText)
  })

  it("renders the body paragraphs", () => {
    expect(screen.getByTestId("eps-404-body1"))
    expect(screen.getByTestId("eps-404-body2"))

    // Check that the paragraph containing both bodyText3 and the link is rendered.
    expect(screen.getByTestId("eps-404-body3"))
  })

  it("renders a link with the correct text and URL", () => {
    const link = screen.getByRole("link", {
      name: NOT_FOUND_PAGE_STRINGS.bodyText3LinkText
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })
})
