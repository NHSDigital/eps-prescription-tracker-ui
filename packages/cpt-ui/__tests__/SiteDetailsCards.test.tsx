// SiteCards.test.tsx
import React from "react"
import {render, screen} from "@testing-library/react"
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

  test("renders SiteDetailsCard with prescribedFrom", () => {
    const props = {
      heading: "Test Heading",
      ...baseProps,
      prescribedFrom: "Test Prescribed"
    }

    render(<SiteDetailsCard {...props} />)

    // Check heading and ODS_LABEL output
    expect(screen.getByText("Test Heading")).toBeInTheDocument()
    expect(
      screen.getByText(`${baseProps.orgName} (${baseProps.orgOds})`)
    ).toBeInTheDocument()

    // Check address and contact details
    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.contact)).toBeInTheDocument()

    // Check prescribedFrom section is rendered
    expect(screen.getByText("Prescribed From")).toBeInTheDocument()
    expect(screen.getByText("Test Prescribed")).toBeInTheDocument()
  })

  test("renders SiteDetailsCard without prescribedFrom", () => {
    const props = {
      heading: "Test Heading",
      ...baseProps
    }

    render(<SiteDetailsCard {...props} />)

    // Check heading, ODS_LABEL, address, and contact
    expect(screen.getByText("Test Heading")).toBeInTheDocument()
    expect(
      screen.getByText(`${baseProps.orgName} (${baseProps.orgOds})`)
    ).toBeInTheDocument()
    expect(screen.getByText(baseProps.address)).toBeInTheDocument()
    expect(screen.getByText("Contact Details")).toBeInTheDocument()
    expect(screen.getByText(baseProps.contact)).toBeInTheDocument()

    // The prescribedFrom section should not be rendered
    expect(screen.queryByText("Prescribed From")).not.toBeInTheDocument()
  })
})

describe("SiteCards Component", () => {
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

  test("renders all three SiteCards when all props are provided", () => {
    render(
      <SiteDetailsCards
        prescriber={prescriber}
        dispenser={dispenser}
        nominatedDispenser={nominatedDispenser}
      />
    )

    // Check that each card heading is rendered
    expect(screen.getByText("Dispenser")).toBeInTheDocument()
    expect(screen.getByText("Nominated Dispenser")).toBeInTheDocument()
    expect(screen.getByText("Prescriber")).toBeInTheDocument()

    // Verify details within the prescriber card
    expect(
      screen.getByText(`${prescriber.orgName} (${prescriber.orgOds})`)
    ).toBeInTheDocument()
    expect(screen.getByText(prescriber.address)).toBeInTheDocument()
    expect(screen.getByText(prescriber.contact)).toBeInTheDocument()

    // Verify details within the dispenser card
    expect(
      screen.getByText(`${dispenser.orgName} (${dispenser.orgOds})`)
    ).toBeInTheDocument()
    expect(screen.getByText(dispenser.address)).toBeInTheDocument()
    expect(screen.getByText(dispenser.contact)).toBeInTheDocument()

    // Verify details within the nominated dispenser card
    expect(
      screen.getByText(`${nominatedDispenser.orgName} (${nominatedDispenser.orgOds})`)
    ).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.address)).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.contact)).toBeInTheDocument()
    expect(screen.getByText("Prescribed From")).toBeInTheDocument()
    expect(screen.getByText(nominatedDispenser.prescribedFrom)).toBeInTheDocument()
  })

  test("renders only prescriber card when dispenser and nominatedDispenser are not provided", () => {
    render(<SiteDetailsCards prescriber={prescriber} />)

    // Check that dispenser and nominated dispenser headings are not rendered
    expect(screen.queryByText("Dispenser")).not.toBeInTheDocument()
    expect(screen.queryByText("Nominated Dispenser")).not.toBeInTheDocument()

    // Only prescriber card should be rendered
    expect(screen.getByText("Prescriber")).toBeInTheDocument()
  })
})
