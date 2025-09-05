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
    expect(screen.getByText("1. Amoxicillin")).toBeInTheDocument()
    expect(screen.getByText("2. Ibuprofen")).toBeInTheDocument()

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
    expect(screen.getByText("1. Amoxicillin")).toBeInTheDocument()
    expect(screen.getByText("2. Ibuprofen")).toBeInTheDocument()

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

  it("renders cancellation reason, when item contains a cancellation reason", () => {
    const items= [{
      medicationName: "Ibuprofen",
      quantity: "20 tablets",
      dosageInstructions: "Take one as needed",
      epsStatusCode: "0005",
      itemPendingCancellation: false,
      cancellationReason: "0001"
    }]
    render(<ItemsCards items={items}/>)

    expect(screen.getByText("Cancellation reason")).toBeInTheDocument()
    expect(screen.getByText("Prescribing Error")).toBeInTheDocument()
  })

  it("renders not dispensed reason, when item contains a non-dispensing reason", () => {
    const items= [{
      medicationName: "Ibuprofen",
      quantity: "20 tablets",
      dosageInstructions: "Take one as needed",
      epsStatusCode: "0002",
      itemPendingCancellation: false,
      notDispensedReason: "0001"
    }]
    render(<ItemsCards items={items}/>)

    expect(screen.getByText("Not dispensed reason")).toBeInTheDocument()
    expect(screen.getByText("Not required as instructed by the patient")).toBeInTheDocument()
  })

  it("does not render any status reasons, when item does not contain a cancellation or non-dispensing reason", () => {
    const items= [{
      medicationName: "Ibuprofen",
      quantity: "20 tablets",
      dosageInstructions: "Take one as needed",
      epsStatusCode: "0001",
      itemPendingCancellation: false
    }]
    render(<ItemsCards items={items}/>)

    expect(screen.queryByText("Not dispensed reason")).not.toBeInTheDocument()
    expect(screen.queryByText("Cancellation reason")).not.toBeInTheDocument()
  })
})
