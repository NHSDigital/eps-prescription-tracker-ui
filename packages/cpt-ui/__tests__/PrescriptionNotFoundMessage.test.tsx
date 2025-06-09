import React from "react"
import {render, screen} from "@testing-library/react"
import {MemoryRouter, Routes, Route} from "react-router-dom"

import PrescriptionNotFoundMessage from "@/components/PrescriptionNotFoundMessage"
import {STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

const DummyPage = ({label}: {label: string}) => <div data-testid="dummy-page">{label}</div>

function setupRouter(
  search = "?firstName=Zoe&lastName=Zero&dobDay=31&dobMonth=12&dobYear=2021&postcode=AB1%202CD"
) {
  render(
    <MemoryRouter initialEntries={["/not-found" + search]}>
      <Routes>
        <Route path="/not-found" element={<PrescriptionNotFoundMessage/>} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS} element={<DummyPage label="Basic Details Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER} element={<DummyPage label="NHS Number Search" />} />
        <Route path={FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID} element={<DummyPage label="Prescription ID Search" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("PrescriptionNotFoundMessage", () => {
  it("renders the main heading and static content", () => {
    setupRouter()
    expect(screen.getByTestId("presc-not-found-heading")).toHaveTextContent(STRINGS.heading)
  })

  // beforeEach(() => {
  //   render(
  //     <MemoryRouter>
  //       <PrescriptionNotFoundMessage />
  //     </MemoryRouter>
  //   )
  // })

  // it("renders the main container with the correct id and class", () => {
  //   const mainElement = screen.getByRole("main")
  //   expect(mainElement).toBeInTheDocument()
  //   expect(mainElement).toHaveAttribute("id", "main-content")
  //   expect(mainElement).toHaveClass("nhsuk-main-wrapper")
  // })

  //   it("renders the proper elements", () => {
  //     const header = screen.getByTestId("presc-not-found-header")
  //     const body = screen.getByTestId("presc-not-found-body1")
  //     const link = screen.getByTestId("presc-not-found-backlink")

  //     expect(header).toHaveTextContent(STRINGS.heading)
  //     expect(body).toHaveTextContent(STRINGS.intro)
  //     // expect(link).toHaveTextContent(STRINGS.goBackLink)
  //   })
  // })

  // describe("PrescriptionNotFoundMessage - searchType parameter behavior", () => {
  //   it("should append hash to the backLink URL when searchType is provided", () => {
  //     render(
  //       <MemoryRouter initialEntries={["/notfound?searchType=example"]}>
  //         <PrescriptionNotFoundMessage />
  //       </MemoryRouter>
  //     )
  //     const link = screen.getByTestId("presc-not-found-backlink")
  //     // The rendered link might have a full URL like "http://localhost/search#example"
  //     expect(link.getAttribute("href")).toContain(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  //   })

//   it("should not append a hash to the backLink URL when searchType is not provided", () => {
//     render(
//       <MemoryRouter initialEntries={["/notfound"]}>
//         <PrescriptionNotFoundMessage />
//       </MemoryRouter>
//     )
//     const link = screen.getByTestId("presc-not-found-backlink")
//     expect(link.getAttribute("href")).toContain("/search")
//     // Ensure that no hash is appended when searchType is absent.
//     expect(link.getAttribute("href")).not.toContain("#")
//   })
})
