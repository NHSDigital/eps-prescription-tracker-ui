import React from "react"
import PrescriptionNotFoundMessage from "@/components/PrescriptionNotFoundMessage"
import {usePageTitle} from "@/hooks/usePageTitle"
import {STRINGS} from "@/constants/ui-strings/PrescriptionNotFoundMessageStrings"

export default function NoPrescriptionsFoundPage() {
  usePageTitle(`${STRINGS.heading} - Prescription Tracker`)

  return <PrescriptionNotFoundMessage />
}
