import React from "react"
import PatientNotFoundMessage from "@/components/PatientNotFoundMessage"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function NoPatientsFoundPage() {
  usePageTitle("Patient not found - Prescription Tracker")

  return <PatientNotFoundMessage />
}
