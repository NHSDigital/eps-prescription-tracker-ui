import {PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"
import {
  mockPrescribedItems,
  mockPrescribedItemsCancellation,
  mockDispenser,
  mockDispensedItems,
  mockDispensedItemsNoPharmacyStatus,
  mockDispensedPartialWithInitial,
  mockDispensedItemsCancelled,
  mockPatientDetails,
  mockUnavailablePatientDetails,
  mockPrescriptionInformation,
  mockPrescriptionInformationErd,
  mockPrescriber,
  mockNominatedDispenser,
  mockMessageHistoryDispenseNotifInfo,
  mockMessageHistoryCancelled,
  mockMessageHistoryPendingCancellation,
  mockMessageHistoryMissingData,
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
    messageHistory: mockMessageHistoryDispenseNotifInfo,
    prescriberOrganisation: mockDispenser
  }

  // ID-specific overrides for different mock scenarios
  const mockPrescriptionOverrides: Record<string, Partial<PrescriptionDetailsResponse>> = {
    "C0C757-A83008-C2D93O": {
      prescribedItems: mockPrescribedItems,
      dispensedItems: mockDispensedItems,
      messageHistory: mockMessageHistoryDispenseNotifInfo,
      prescriberOrganisation: mockPrescriber,
      nominatedDispenser: mockNominatedDispenser,
      currentDispenser: mockDispenser
    },
    "209E3D-A83008-327F9F": {
      prescribedItems: mockPrescribedItems,
      dispensedItems: mockDispensedItems,
      patientDetails: mockUnavailablePatientDetails,
      prescriberOrganisation: altMockPrescriber,
      nominatedDispenser: undefined,
      currentDispenser: undefined
    },
    "3F885D-A83008-900ACJ": {
      ...mockPrescriptionInformationErd,
      prescriptionId,
      prescribedItems: mockPrescribedItemsCancellation,
      messageHistory: mockMessageHistoryPendingCancellation,
      prescriberOrganisation: mockPrescriber,
      nominatedDispenser: undefined,
      currentDispenser: mockDispenser
    },
    "04E5F7-A83008-D71BCQ": {
      prescribedItems: [],
      dispensedItems: mockDispensedPartialWithInitial,
      prescriberOrganisation: altMockPrescriber,
      nominatedDispenser: altMockNominatedDispenser,
      currentDispenser: mockDispenser
    },
    "15023D-A83008-298451": {
      dispensedItems: mockDispensedItemsNoPharmacyStatus,
      messageHistory: mockMessageHistoryDispenseNotifInfo,
      prescriberOrganisation: mockPrescriber,
      statusCode: "0006", // All items dispensed
      nominatedDispenser: {
        name: undefined,
        odsCode: "FV519",
        address: undefined,
        telephone: undefined
      },
      currentDispenser: mockDispenser
    },
    "3DA34A-A83008-A0B2EV": {
      statusCode: "0005", // Cancelled
      prescribedItems: [],
      dispensedItems: mockDispensedItemsCancelled,
      messageHistory: mockMessageHistoryCancelled,
      prescriberOrganisation: mockPrescriber
    },
    "88AAF5-A83008-3D404Q": {
      dispensedItems: mockDispensedItemsNoPharmacyStatus,
      messageHistory: mockMessageHistoryMissingData,
      prescriberOrganisation: mockPrescriber,
      statusCode: "0006", // All items dispensed
      nominatedDispenser: {
        name: undefined,
        odsCode: "FV519",
        address: undefined,
        telephone: undefined
      },
      currentDispenser: mockDispenser
    }
  }

  const scenario = mockPrescriptionOverrides[prescriptionId]
  return scenario ? {...commonPrescriptionData, ...scenario} : undefined
}
