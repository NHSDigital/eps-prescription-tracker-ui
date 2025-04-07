import React from "react"
import {render, screen, within} from "@testing-library/react"

import "@testing-library/jest-dom"

import {SiteDetailsCard, SiteDetailsCards} from "@/components/SiteDetailsCards"

// Mock the constants
jest.mock("@/constants/ui-strings/SiteDetailsCardsStrings", () => ({
  CONTACT_DETAILS: "Contact Details",
  DISPENSER: "Dispenser",
  NOMINATED_DISPENSER: "Nominated Dispenser",
  ODS_LABEL: (orgName: string, orgOds: string) => `${orgName} (${orgOds})`,
  PRESCRIBED_FROM: "Prescribed From",
  PRESCRIBER: "Prescriber"
}))

describe("SiteDetailsCard Component", () => {
  const baseProps = {
    orgName: "Test Org",
    orgOds: "ABC123",
    address: "123 Test Street",
    contact: "01234567890"
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

    // look for heading and organization details using the ODS_LABEL helper
    expect(screen.getByText("Test Heading")).toBeInTheDocument()
    expect(screen.getByText(`${baseProps.orgName} (${baseProps.orgOds})`)).toBeInTheDocument()

    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.contact)).toBeInTheDocument()

    // Check that the prescribedFrom section is rendered using its test id
    const prescribedEl = screen.getByTestId("site-card-prescribed-from")
    expect(prescribedEl).toBeInTheDocument()
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
    expect(screen.getByText(`${baseProps.orgName} (${baseProps.orgOds})`)).toBeInTheDocument()
    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.contact)).toBeInTheDocument()

    // The prescribedFrom section should be absent
    expect(screen.queryByTestId("site-card-prescribed-from")).not.toBeInTheDocument()
  })
})

describe("SiteDetailsCards Component", () => {
  const prescriber = {
    orgName: "Prescriber Org",
    orgOds: "11111",
    address: "Prescriber Address",
    contact: "prescriber@example.com"
  }

  const dispenser = {
    orgName: "Dispenser Org",
    orgOds: "22222",
    address: "Dispenser Address",
    contact: "dispenser@example.com"
  }

  const nominatedDispenser = {
    orgName: "Nominated Dispenser Org",
    orgOds: "33333",
    address: "Nominated Address",
    contact: "nominated@example.com",
    prescribedFrom: "Nominated Prescribed"
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
    expect(screen.getByText(`${prescriber.orgName} (${prescriber.orgOds})`)).toBeInTheDocument()
    expect(screen.getByText(prescriber.address)).toBeInTheDocument()
    expect(screen.getByText(prescriber.contact)).toBeInTheDocument()

    // dispenser card
    expect(screen.getByText(`${dispenser.orgName} (${dispenser.orgOds})`)).toBeInTheDocument()
    expect(screen.getByText(dispenser.address)).toBeInTheDocument()
    expect(screen.getByText(dispenser.contact)).toBeInTheDocument()

    // nominated dispenser card
    expect(screen.getByText(`${nominatedDispenser.orgName} (${nominatedDispenser.orgOds})`)).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.address)).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.contact)).toBeInTheDocument()

    // check for the prescribedFrom section
    const nominatedCard = screen.getByTestId("site-card-nominated-dispenser")
    // Make sure we only look for the prescribedFrom text, within the nominated card!
    const prescribedEl = within(nominatedCard).getByTestId("site-card-prescribed-from")
    expect(prescribedEl).toBeInTheDocument()
    expect(screen.getByText("Prescribed From")).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.prescribedFrom)).toBeInTheDocument()
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
