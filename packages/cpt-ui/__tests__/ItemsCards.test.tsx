import React from "react"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom"

import {ItemsCards} from "@/components/prescriptionDetails/ItemsCards"

describe("ItemsCards", () => {
  const items = [
    {
      medicationName: "Amoxicillin",
      quantity: "30 tablets",
      dosageInstructions: "Take one three times a day",
      epsStatusCode: "0004", // Item not dispensed - owing
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: false
    },
    {
      medicationName: "Ibuprofen",
      quantity: "20 tablets",
      dosageInstructions: "Take one as needed",
      epsStatusCode: "0001", // Item fully dispensed
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  ]

  it("renders dispensed and prescribed sections with items and status tags", () => {
    render(<ItemsCards items={items} />)

    // Section header
    expect(screen.getByText("Items")).toBeInTheDocument()

    // Medications
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument()
    expect(screen.getByText("Amoxicillin")).toBeInTheDocument()

    // Tag status labels
    expect(screen.getByText("Item fully dispensed")).toBeInTheDocument()
    expect(screen.getByText("Item not dispensed - owing")).toBeInTheDocument()

    // Quantities
    expect(screen.getByText("20 tablets")).toBeInTheDocument()
    expect(screen.getByText("30 tablets")).toBeInTheDocument()

    // Dosage instructions
    expect(screen.getByText("Take one as needed")).toBeInTheDocument()
    expect(screen.getByText("Take one three times a day")).toBeInTheDocument()

    // Pharmacy statuses
    expect(screen.getByText("Collected")).toBeInTheDocument()
    expect(screen.getByText("With pharmacy")).toBeInTheDocument()
  })

  it("renders dispensed with no instructions, if 'unknown' dosageInstructions returned", () => {
    items[1].dosageInstructions = "Unknown"

    render(<ItemsCards items={items} />)

    // Section header
    expect(screen.getByText("Items")).toBeInTheDocument()

    // Medications
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument()
    expect(screen.getByText("Amoxicillin")).toBeInTheDocument()

    // Tag status labels
    expect(screen.getByText("Item fully dispensed")).toBeInTheDocument()
    expect(screen.getByText("Item not dispensed - owing")).toBeInTheDocument()

    // Quantities
    expect(screen.getByText("20 tablets")).toBeInTheDocument()
    expect(screen.getByText("30 tablets")).toBeInTheDocument()

    // Dosage instructions
    expect(screen.queryByText("Take one as needed")).not.toBeInTheDocument()
    expect(screen.getByText("Take one three times a day")).toBeInTheDocument()

    // Pharmacy statuses
    expect(screen.getByText("Collected")).toBeInTheDocument()
    expect(screen.getByText("With pharmacy")).toBeInTheDocument()
  })
})
