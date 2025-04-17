import React from "react"
import {render, screen} from "@testing-library/react"
import "@testing-library/jest-dom"

import {PrescribedDispensedItemsCards} from "@/components/PrescribedDispensedItemsCards"

describe("PrescribedDispensedItemsCards", () => {
  const dispensedItems = [
    {
      itemDetails: {
        medicationName: "Ibuprofen",
        quantity: "20 tablets",
        dosageInstructions: "Take one as needed",
        epsStatusCode: "0001", // Item fully dispensed
        pharmacyStatus: "Collected",
        itemPendingCancellation: false
      }
    }
  ]

  const prescribedItems = [
    {
      itemDetails: {
        medicationName: "Amoxicillin",
        quantity: "30 tablets",
        dosageInstructions: "Take one three times a day",
        epsStatusCode: "0004", // Item not dispensed - owing
        pharmacyStatus: "With pharmacy",
        itemPendingCancellation: false,
        cancellationReason: null
      }
    }
  ]

  it("renders dispensed and prescribed sections with items and status tags", () => {
    render(
      <PrescribedDispensedItemsCards
        prescribedItems={prescribedItems}
        dispensedItems={dispensedItems}
      />
    )

    // Section headers
    expect(screen.getByText("Dispensed items")).toBeInTheDocument()
    expect(screen.getByText("Prescribed items")).toBeInTheDocument()

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
})
