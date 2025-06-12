import {
  PrescriberOrganisationSummary,
  PatientDetails,
  OrganisationSummary,
  MessageHistory,
  DispensedItemDetails
} from "@cpt-ui-common/common-types"
import {PrescribedItemDetails} from "@cpt-ui-common/common-types/src"

export const mockPrescriber: PrescriberOrganisationSummary = {
  name: "Fiji surgery",
  odsCode: "FI05964",
  address: "90 YARROW LANE, FINNSBURY, E45 T46",
  telephone: "01232 231321",
  prescribedFrom: "012345"
}
export const altMockPrescriber: PrescriberOrganisationSummary = {
  name: "Fiji surgery",
  odsCode: "FI05964",
  address: "90 YARROW LANE, FINNSBURY, E45 T46",
  telephone: "01232 231321",
  prescribedFrom: "021345"
}

export const mockDispenser: OrganisationSummary = {
  name: "Cohens chemist",
  odsCode: "FV519",
  address: "22 RUE LANE, CHISWICK, KT19 D12",
  telephone: "01943 863158"
}
export const mockNominatedDispenser: OrganisationSummary = {
  name: "Cohens chemist",
  odsCode: "FV519",
  address: "22 RUE LANE, CHISWICK, KT19 D12",
  telephone: "01943 863158"
}
export const altMockNominatedDispenser: OrganisationSummary = {
  name: "Some Guy",
  odsCode: "ABC123",
  // eslint-disable-next-line max-len
  address: "7&8 WELLINGTON PLACE, thisisaverylongwordthatshouldtriggerthelinetowraparoundwhilstbreakingthewordupintosmallerchunks, LEEDS, LS1 4AP",
  telephone: "07712 345678"
}

export const mockPatientDetails: PatientDetails = {
  nhsNumber: "5900009890",
  prefix: "Mr",
  suffix: "",
  given: "William",
  family: "Wolderton",
  gender: "male",
  dateOfBirth: "01-Nov-1988",
  address: {
    line1: "55 OAK STREET",
    line2: "OAK LANE",
    city: "Leeds",
    postcode: "LS1 1XX"
  }
}
export const mockUnavailablePatientDetails: PatientDetails = {
  nhsNumber: "5900009890",
  prefix: "Ms",
  suffix: "",
  given: "Janet",
  family: "Piper",
  gender: null,
  dateOfBirth: null,
  address: null
}

export const mockPrescribedItems: Array<PrescribedItemDetails> = [
  {
    medicationName: "Oseltamivir 30mg capsules",
    quantity: "20 capsules",
    dosageInstructions: "One capsule twice a day",
    epsStatusCode: "0004", //Item not dispensed - owing
    pharmacyStatus: "With pharmacy",
    itemPendingCancellation: false,
    cancellationReason: null
  }
]
export const mockPrescribedItemsCancellation: Array<PrescribedItemDetails> = [
  {
    medicationName: "Phosphates enema (Formula B) 129ml standard tube",
    quantity: "1 tube",
    dosageInstructions: "Use ONE when required",
    epsStatusCode: "0007", // Item not dispensed
    pharmacyStatus: "With pharmacy",
    itemPendingCancellation: true,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Mirtazapine 30mg",
    quantity: "1 spray",
    dosageInstructions: "Use as needed",
    epsStatusCode: "0007", // Item not dispensed
    pharmacyStatus: "With pharmacy",
    itemPendingCancellation: true,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Oseltamivir 30mg capsules",
    quantity: "20 capsules",
    dosageInstructions: "One capsule twice a day",
    epsStatusCode: "0007", // Item not dispensed
    pharmacyStatus: "With pharmacy",
    itemPendingCancellation: true,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
    quantity: "21 tablets",
    dosageInstructions: "Take 3 times a day with water",
    epsStatusCode: "0007", // Item not dispensed
    pharmacyStatus: "With pharmacy",
    itemPendingCancellation: true,
    cancellationReason: "Prescribing error"
  }
]

export const mockDispensedItems: Array<DispensedItemDetails> = [
  {
    medicationName: "Raberprazole 10mg tablets",
    quantity: "56 tablets",
    dosageInstructions: "Take one twice daily",
    epsStatusCode: "0001", // Item fully dispensed
    pharmacyStatus: "Collected",
    itemPendingCancellation: false
  },
  {
    medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
    quantity: "1 spray",
    dosageInstructions: "Use as needed",
    epsStatusCode: "0001", // Item fully dispensed
    pharmacyStatus: "Collected",
    itemPendingCancellation: false
  }
]
export const mockDispensedItemsNoPharmacyStatus: Array<DispensedItemDetails> = [
  {
    medicationName: "Raberprazole 10mg tablets",
    quantity: "56 tablets",
    dosageInstructions: "Take one twice daily",
    epsStatusCode: "0001",
    pharmacyStatus: undefined,
    itemPendingCancellation: false
  },
  {
    medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
    quantity: "1 spray",
    dosageInstructions: "Use as needed",
    epsStatusCode: "0001",
    pharmacyStatus: undefined,
    itemPendingCancellation: false
  },
  {
    medicationName: "Oseltamivir 30mg capsules",
    quantity: "20 capsules",
    dosageInstructions: "One capsule twice a day",
    epsStatusCode: "0001",
    pharmacyStatus: undefined,
    itemPendingCancellation: false
  }
]
export const mockDispensedPartialWithInitial: Array<DispensedItemDetails> = [
  {
    medicationName: "Raberprazole 10mg tablets",
    quantity: "28 out of 56 tablets",
    dosageInstructions: "Take one twice daily",
    epsStatusCode: "0003", // Item dispensed - partial
    pharmacyStatus: "Collected",
    itemPendingCancellation: false,
    initiallyPrescribed: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "56 tablets",
      dosageInstructions: "Take one twice daily"
    }
  },
  {
    medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
    quantity: "1 spray",
    dosageInstructions: "Use as needed",
    epsStatusCode: "0001",
    pharmacyStatus: "Collected",
    itemPendingCancellation: false
  }
]
export const mockDispensedItemsCancelled: Array<DispensedItemDetails> = [
  {
    medicationName: "Raberprazole 10mg tablets",
    quantity: "56 tablets",
    dosageInstructions: "Take one twice daily",
    epsStatusCode: "0005", // Item cancelled
    pharmacyStatus: "Prescriber cancelled",
    itemPendingCancellation: false,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
    quantity: "1 spray",
    dosageInstructions: "Use as needed",
    epsStatusCode: "0005", // Item cancelled
    pharmacyStatus: "Prescriber cancelled",
    itemPendingCancellation: false,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Oseltamivir 30mg capsules",
    quantity: "20 capsules",
    dosageInstructions: "One capsule twice a day",
    epsStatusCode: "0005", // Item cancelled
    pharmacyStatus: "Prescriber cancelled",
    itemPendingCancellation: false,
    cancellationReason: "Prescribing error"
  },
  {
    medicationName: "Mirtazapine 30mg",
    quantity: "21 tablets",
    dosageInstructions: "Take once a day",
    epsStatusCode: "0005", // Item cancelled
    pharmacyStatus: "Prescriber cancelled",
    itemPendingCancellation: false,
    cancellationReason: "Prescribing error"
  }
]

export const mockPrescriptionInformation = {
  prescriptionId: "",
  issueDate: "18-Jan-2024",
  statusCode: "0003", // Some items dispensed"
  typeCode: "Acute",
  isERD: false,
  instanceNumber: 2,
  maxRepeats: 6,
  daysSupply: "28"
}
export const mockPrescriptionInformationErd = {
  prescriptionId: "",
  issueDate: "22-Mar-2024",
  statusCode: "0002", // Downloaded by a dispenser
  typeCode: "eRD",
  isERD: true,
  instanceNumber: 1,
  maxRepeats: 6,
  daysSupply: "28"
}

export const mockMessageHistoryDispenseNotifInfo: Array<MessageHistory> = [
  {
    messageCode: "Dispense claim successful",
    sentDateTime: "23-Feb-2025 13:35:33",
    organisationName: "Cohen's Chemist",
    organisationODS: "FV519",
    newStatusCode: "0006",
    dispenseNotification: [
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Raberprazole 10mg tablets",
        quantity: "56 tablets",
        dosageInstruction: "Take one twice daily"
      },
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
        quantity: "1 spray",
        dosageInstruction: "Use as needed"
      },
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Oseltamivir 30mg capsules",
        quantity: "20 capsules",
        dosageInstruction: "Take 3 times a day with water"
      }
    ]
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "23-Feb-2025 13:05:33",
    organisationName: "Cohen's Chemist",
    organisationODS: "FV519",
    newStatusCode: "0002"
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "23-Feb-2025 12:33:33",
    organisationName: "Fiji surgery",
    organisationODS: "FI05964",
    newStatusCode: "0001"
  }
]
export const mockMessageHistoryCancelled: Array<MessageHistory> = [
  {
    messageCode: "Dispense claim successful",
    sentDateTime: "02-Jan-2025 13:35:33",
    organisationName: "Fiji surgery",
    organisationODS: "F10DE",
    newStatusCode: "0005"
  },
  {
    messageCode: "Dispense claim successful",
    sentDateTime: "02-Jan-2025 13:05:33",
    organisationName: "Cohen's Chemist",
    organisationODS: "FV519",
    newStatusCode: "0001"
  },
  {
    messageCode: "Prescription/item was not cancelled. With dispenser. Marked for cancellation",
    sentDateTime: "23-Feb-2025 13:35:33",
    organisationName: "Fiji surgery",
    organisationODS: "F10DE"
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "01-Jan-2025 12:33:33",
    organisationName: "Cohen's Chemist",
    organisationODS: "FV519",
    newStatusCode: "0002"
  },
  {
    messageCode: "Prescription upload successful",
    sentDateTime: "01-Jan-2025 12:33:33",
    organisationName: "Fiji surgery",
    organisationODS: "F10DE",
    newStatusCode: "0001"
  }
]
export const mockMessageHistoryPendingCancellation: Array<MessageHistory> = [
  {
    messageCode: "Prescription/item was not cancelled. With dispenser. Marked for cancellation",
    sentDateTime: "20-Jan-2025 13:35:33",
    organisationName: "Fiji surgery",
    organisationODS: "FI05964"
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "20-Jan-2025 13:05:33",
    organisationName: "Cohen's Chemist",
    organisationODS: "FV519",
    newStatusCode: "0002"
  },
  {
    messageCode: "Prescription upload successful",
    sentDateTime: "20-Jan-2025 12:33:33",
    organisationName: "Fiji surgery",
    organisationODS: "F10DE",
    newStatusCode: "0001"
  }
]
export const mockMessageHistoryMissingData: Array<MessageHistory> = [
  {
    messageCode: "Dispense claim successful",
    sentDateTime: "23-Feb-2025 13:35:33",
    organisationName: "",
    organisationODS: "FV519",
    newStatusCode: "0006",
    dispenseNotification: [
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Raberprazole 10mg tablets",
        quantity: "56 tablets",
        dosageInstruction: "Take one twice daily"
      },
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
        quantity: "1 spray",
        dosageInstruction: "Use as needed"
      },
      {
        id: "b240434e-cb85-40bb-899c-1c61410c93a7",
        medicationName: "Oseltamivir 30mg capsules",
        quantity: "20 capsules",
        dosageInstruction: "Take 3 times a day with water"
      }
    ]
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "23-Feb-2025 13:05:33",
    organisationName: "",
    organisationODS: "FV519",
    newStatusCode: "0002"
  },
  {
    messageCode: "Release Request successful",
    sentDateTime: "23-Feb-2025 12:33:33",
    // eslint-disable-next-line max-len
    organisationName: "theultraextremelylongorganisationnamethatexceedsthecontainerwidthandshouldforcethetexttowrapcorrectlywithoutbreakingtheui",
    organisationODS: "FI05964",
    newStatusCode: "0001"
  }
]
