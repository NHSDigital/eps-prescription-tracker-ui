import {PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"
import {
  mockPrescribedItems,
  mockPrescribedItemsCancellation,
  mockDispenser,
  mockDispensedItems,
  mockDispensedItemsNoPharmacyStatus,
  mockDispensedPartialWithInitial,
  mockPatientDetails,
  mockUnavailablePatientDetails,
  mockPrescriptionInformation,
  mockPrescriptionInformationErd,
  mockPrescriber,
  mockNominatedDispenser,
  altMockPrescriber,
  altMockNominatedDispenser
} from "@/mocks/mockPrescriptions"

export const getMockPayload = (prescriptionId: string): PrescriptionDetailsResponse | undefined => {
  // Shared base structure for all mock payloads
  const commonPrescriptionData: PrescriptionDetailsResponse = {
    ...mockPrescriptionInformation,
    prescriptionId,
    patientDetails: mockPatientDetails,
    prescribedItems: [],
    dispensedItems: [],
    prescriptionPendingCancellation: false,
    messageHistory: [],
    prescriberOrganisation: {organisationSummaryObjective: mockDispenser}
  }

  // ID-specific overrides for different mock scenarios
  const mockPrescriptionOverrides: Record<string, Partial<PrescriptionDetailsResponse>> = {
    "C0C757-A83008-C2D93O": {
      prescribedItems: mockPrescribedItems,
      dispensedItems: mockDispensedItems,
      prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
      nominatedDispenser: {organisationSummaryObjective: mockNominatedDispenser},
      currentDispenser: [{organisationSummaryObjective: mockDispenser}]
    },
    "209E3D-A83008-327F9F": {
      prescribedItems: mockPrescribedItems,
      dispensedItems: mockDispensedItems,
      patientDetails: mockUnavailablePatientDetails,
      prescriberOrganisation: {organisationSummaryObjective: altMockPrescriber},
      nominatedDispenser: undefined,
      currentDispenser: undefined
    },
    "7F1A4B-A83008-91DC2E": {
      ...mockPrescriptionInformationErd,
      prescriptionId,
      prescribedItems: mockPrescribedItemsCancellation,
      prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
      nominatedDispenser: undefined,
      currentDispenser: [{organisationSummaryObjective: mockDispenser}]
    },
    "B8C9E2-A83008-5F7B3A": {
      prescribedItems: [],
      dispensedItems: mockDispensedPartialWithInitial,
      prescriberOrganisation: {organisationSummaryObjective: altMockPrescriber},
      nominatedDispenser: {organisationSummaryObjective: altMockNominatedDispenser},
      currentDispenser: [{organisationSummaryObjective: mockDispenser}]
    },
    "4D6F2C-A83008-A3E7D1": {
      dispensedItems: mockDispensedItemsNoPharmacyStatus,
      prescriberOrganisation: {organisationSummaryObjective: mockPrescriber},
      statusCode: "0006", // All items dispensed
      nominatedDispenser: {
        organisationSummaryObjective: {
          name: undefined,
          odsCode: "FV519",
          address: undefined,
          telephone: undefined
        }
      },
      currentDispenser: [{organisationSummaryObjective: mockDispenser}]
    }
  }

  const scenario = mockPrescriptionOverrides[prescriptionId]
  return scenario ? {...commonPrescriptionData, ...scenario} : undefined
}
