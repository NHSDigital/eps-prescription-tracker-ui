import {PrescriptionDetailsResponse} from "@cpt-ui-common/common-types"

export const mockPrescriptionDetailsResponse: PrescriptionDetailsResponse = {
  patientDetails: {
    nhsNumber: "123",
    given: "John",
    family: "Doe",
    prefix: "Mr",
    suffix: "",
    gender: "male",
    dateOfBirth: "1980-01-01",
    address: {
      line1: "Some address",
      line2: "123 Street",
      city: "City",
      postcode: "LS11TW"
    }
  },
  prescriptionId: "SUCCESS_ID",
  typeCode: "type",
  statusCode: "status",
  issueDate: "2020-01-01",
  instanceNumber: 1,
  maxRepeats: 0,
  daysSupply: "30",
  prescriptionPendingCancellation: false,
  prescribedItems: [],
  dispensedItems: [],
  messageHistory: [],
  prescriberOrganisation: {
    name: "Fiji surgery",
    odsCode: "FI05964",
    address: "90 YARROW LANE, FINNSBURY, E45 T46",
    telephone: "01232 231321",
    prescribedFrom: "England"
  },
  nominatedDispenser: {
    name: "Some Nominated Dispenser",
    odsCode: "NOM123",
    address: "Nominated Address",
    telephone: "1234567890"
  },
  currentDispenser: {
    name: "Cohens chemist",
    odsCode: "FV519",
    address: "22 RUE LANE, CHISWICK, KT19 D12",
    telephone: "01943 863158"
  }
}
