import {
  PrescriberOrganisationSummary,
  PatientDetails,
  OrganisationSummary,
  DispensedItem,
  PrescribedItem,
  MessageHistory
} from "@cpt-ui-common/common-types"

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

export const mockPrescribedItems: Array<PrescribedItem> = [
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0004", //Item not dispensed - owing
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: false,
      cancellationReason: null
    }
  }
]
export const mockPrescribedItemsCancellation: Array<PrescribedItem> = [
  {
    itemDetails: {
      medicationName: "Phosphates enema (Formula B) 129ml standard tube",
      quantity: "1 tube",
      dosageInstructions: "Use ONE when required",
      epsStatusCode: "0007", // Item not dispensed
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Mirtazapine 30mg",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0007", // Item not dispensed
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0007", // Item not dispensed
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "21 tablets",
      dosageInstructions: "Take 3 times a day with water",
      epsStatusCode: "0007", // Item not dispensed
      pharmacyStatus: "With pharmacy",
      itemPendingCancellation: true,
      cancellationReason: "Prescribing error"
    }
  }
]

export const mockDispensedItems: Array<DispensedItem> = [
  {
    itemDetails: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "56 tablets",
      dosageInstructions: "Take one twice daily",
      epsStatusCode: "0001", // Item fully dispensed
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001", // Item fully dispensed
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
  }
]
export const mockDispensedItemsNoPharmacyStatus: Array<DispensedItem> = [
  {
    itemDetails: {
      medicationName: "Raberprazole 10mg tablets",
      quantity: "56 tablets",
      dosageInstructions: "Take one twice daily",
      epsStatusCode: "0001",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  },
  {
    itemDetails: {
      medicationName: "Oseltamivir 30mg capsules",
      quantity: "20 capsules",
      dosageInstructions: "One capsule twice a day",
      epsStatusCode: "0001",
      pharmacyStatus: undefined,
      itemPendingCancellation: false
    }
  }
]
export const mockDispensedPartialWithInitial: Array<DispensedItem> = [
  {
    itemDetails: {
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
    }
  },
  {
    itemDetails: {
      medicationName: "Glyceryl trinitrate 400micrograms/does aerosol sublingual spray",
      quantity: "1 spray",
      dosageInstructions: "Use as needed",
      epsStatusCode: "0001",
      pharmacyStatus: "Collected",
      itemPendingCancellation: false
    }
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
export const mockMessageHistory: Array<MessageHistory> = [
  {
    messageCode: "0003",
    sentDateTime: "2024-01-18T10:00:00Z",
    organisationName: "Cohen's Chemist ",
    organisationODS: "FV519",
    newStatusCode: "0006"
  },
  {
    messageCode: "0003",
    sentDateTime: "2024-01-18T10:00:00Z",
    organisationName: "Fiji surgery",
    organisationODS: "FI05964",
    newStatusCode: "0001"
  }
]
