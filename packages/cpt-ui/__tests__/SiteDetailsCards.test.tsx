import React from "react"
import {render, screen, within} from "@testing-library/react"

import "@testing-library/jest-dom"

import {SiteDetailsCard, SiteDetailsCards} from "@/components/SiteDetailsCards"

// Mock the constants
jest.mock("@/constants/ui-strings/SiteDetailsCardsStrings", () => ({
  CONTACT_DETAILS: "Contact Details",
  DISPENSER: "Dispenser",
  NOMINATED_DISPENSER: "Nominated Dispenser",
  // I put a bit of noise in this function to check that the mock one is being used,
  // and not some hardcoded something or other
  ODS_LABEL: (name: string, odsCode: string) => `${name} SPAM AND EGGS (${odsCode})`,
  PRESCRIBED_FROM: "Prescribed From",
  PRESCRIBER: "Prescriber"
}))

describe("SiteDetailsCard Component", () => {
  const baseProps = {
    name: "Test Org",
    odsCode: "ABC123",
    address: "123 Test Street",
    telephone: "01234567890"
  }

  it("renders SiteDetailsCard with prescribedFrom", () => {
    const props = {
      heading: "Test Heading",
      ...baseProps,
      prescribedFrom: "Test Prescribed"
    }

    render(<SiteDetailsCard {...props} />)

    // Check card container using the test id (important later for regression tests)
    const card = screen.getByTestId("site-card-test-heading")
    expect(card).toBeInTheDocument()

    expect(screen.getByText("Test Heading")).toBeInTheDocument()
    // check that the ODS_LABEL helper is being used, and has outputted the correct format
    expect(screen.getByText(`${baseProps.name} SPAM AND EGGS (${baseProps.odsCode})`)).toBeInTheDocument()

    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.telephone)).toBeInTheDocument()

    // Check that the prescribedFrom section is rendered using its test id
    const prescribedFromEl = screen.getByTestId("site-card-prescribed-from")
    expect(prescribedFromEl).toBeInTheDocument()
    expect(screen.getByText("Prescribed From")).toBeInTheDocument()
    expect(screen.getByText("Test Prescribed")).toBeInTheDocument()
  })

  it("renders SiteDetailsCard without prescribedFrom", () => {
    const props = {
      heading: "Test Heading",
      ...baseProps
    }

    render(<SiteDetailsCard {...props} />)

    // Check card container using the test id based on heading
    const card = screen.getByTestId("site-card-test-heading")
    expect(card).toBeInTheDocument()

    // Required fields
    expect(screen.getByText("Test Heading")).toBeInTheDocument()
    expect(screen.getByText(`${baseProps.name} SPAM AND EGGS (${baseProps.odsCode})`)).toBeInTheDocument()
    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.telephone)).toBeInTheDocument()

    // The prescribedFrom section should be absent
    expect(screen.queryByTestId("site-card-prescribed-from")).not.toBeInTheDocument()
  })
})

describe("SiteDetailsCards Component", () => {
  const prescriber = {
    name: "Prescriber Org",
    odsCode: "11111",
    address: "Prescriber Address",
    telephone: "prescriber@example.com",
    prescribedFrom: "Nominated Prescribed"
  }

  const dispenser = {
    name: "Dispenser Org",
    odsCode: "22222",
    address: "Dispenser Address",
    telephone: "dispenser@example.com"
  }

  const nominatedDispenser = {
    name: "Nominated Dispenser Org",
    odsCode: "33333",
    address: "Nominated Address",
    telephone: "nominated@example.com"
  }

  it("renders all three SiteDetailsCards when all props are provided", () => {
    render(
      <SiteDetailsCards
        prescriber={prescriber}
        dispenser={dispenser}
        nominatedDispenser={nominatedDispenser}
      />
    )

    // Check that each card is rendered using its test id based on the heading
    expect(screen.getByTestId("site-card-dispenser")).toBeInTheDocument()
    expect(screen.getByTestId("site-card-nominated-dispenser")).toBeInTheDocument()
    expect(screen.getByTestId("site-card-prescriber")).toBeInTheDocument()

    // prescriber card
    expect(screen.getByText(`${prescriber.name} SPAM AND EGGS (${prescriber.odsCode})`)).toBeInTheDocument()
    expect(screen.getByText(prescriber.address)).toBeInTheDocument()
    expect(screen.getByText(prescriber.telephone)).toBeInTheDocument()

    // dispenser card
    expect(screen.getByText(`${dispenser.name} SPAM AND EGGS (${dispenser.odsCode})`)).toBeInTheDocument()
    expect(screen.getByText(dispenser.address)).toBeInTheDocument()
    expect(screen.getByText(dispenser.telephone)).toBeInTheDocument()

    // nominated dispenser card
    expect(screen.getByText(`${nominatedDispenser.name} SPAM AND EGGS (${nominatedDispenser.odsCode})`))
      .toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.address)).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.telephone)).toBeInTheDocument()

    // check for the prescribedFrom section
    const prescriberCard = screen.getByTestId("site-card-prescriber")
    // Make sure we only look for the prescribedFrom text, within the prescriber card!
    const prescribedEl = within(prescriberCard).getByTestId("site-card-prescribed-from")
    expect(prescribedEl).toBeInTheDocument()
    expect(screen.getByText("Prescribed From")).toBeInTheDocument()
    expect(screen.getByText(prescriber.prescribedFrom)).toBeInTheDocument()
  })

  it("renders only prescriber card when dispenser and nominatedDispenser are not provided", () => {
    render(<SiteDetailsCards prescriber={prescriber} />)

    // Only the prescriber card should be rendered
    expect(screen.getByTestId("site-card-prescriber")).toBeInTheDocument()

    // Dispenser and nominated dispenser cards absent
    expect(screen.queryByTestId("site-card-dispenser")).not.toBeInTheDocument()
    expect(screen.queryByTestId("site-card-Nominated-Dispenser")).not.toBeInTheDocument()
  })
})
