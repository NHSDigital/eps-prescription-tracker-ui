/* eslint-disable max-len */
import {jest} from "@jest/globals"
import {single_patient} from "./patientSearch/examples/index"

import {parsePatient} from "../src/parsePatient"
import {PatientAddress} from "../src/schema/address"
import {UnrestrictedPatient} from "../src/schema/patient"
import {
  NOT_AVAILABLE,
  PatientAddressUse,
  PatientNameUse,
  PatientSummaryGender
} from "@cpt-ui-common/common-types"

interface ValueCombinationTestCase {
  description: Array<string>
  addresses: Array<PatientAddress>,
  expectedAddress: PatientAddress
}

describe("Patient FHIR resource parsing unit tests", () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01"))
  })

  afterAll(() => {
    jest.setSystemTime(jest.getRealSystemTime())
    jest.useRealTimers()
  })

  describe("Address parsing", () => {
    const valueCombinationsTestCases: Array<ValueCombinationTestCase> = [
    /* -- Home Past/None Combinations -- */
      {
        description: ["Home", "Home: Past/None, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Past/None, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Past/None, Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Past/None, Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Past/None, Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Past/None, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2031-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Home Past/Future Combinations -- */
      {
        description: ["Home", "Home: Past/Future, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Past/Future, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Past/Future, Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Past/Future, Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Past/Future, Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Past/Future, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Home Future/None Combinations -- */
      {
        description: ["Temp", "Home: Future/None, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/None, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Future/None(closest start date), Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2029-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2029-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Future/None, Temp: Future/None(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2029-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2029-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/None(same start  date), Temp: Future/None(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Future/None, Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Future/None(closest start date), Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2029-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2029-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Future/None, Temp: Future/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2029-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2029-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/None(same start date), Temp: Future/Future(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/None, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Home Past/Past Combinations -- */
      {
        description: ["Temp", "Home: Past/Past, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Past/Past, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Past/Past, Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Past/Past(closest end date), Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Past/Past, Temp: Past/Past(closest end date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Past/Past(same end date), Temp: Past/Past(same end date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2009-01-01",
            end: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Past/Past, Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Past/Past, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Home Future/Future Combinations -- */
      {
        description: ["Temp", "Home: Future/Future, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/Future, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Future/Future(closest start date), Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2029-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2029-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Future/Future, Temp: Future/None(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2029-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2029-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/Future(same start date), Temp: Future/None(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: Future/Future, Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: Future/Future(closest start date), Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2029-01-01",
              end: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2029-01-01",
            end: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: Future/Future, Temp: Future/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2029-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2029-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/Future(same start date), Temp: Future/Future(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: Future/Future, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Home None/None Combinations -- */
      {
        description: ["Temp", "Home: None/None, Temp: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp", "Home: None/None, Temp: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home", "Home: None/None, Temp: Future/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: None/None, Temp: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home", "Home: None/None, Temp: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp", "Home: None/None, Temp: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Multiple All Active Home Combinations -- */
      {
        description: ["Home2", "Home1: None/None, Home2: Past/None(closest start date), Home3: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2015-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-02"
            },
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2015-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home3", "Home1: None/None, Home2: Past/None, Home3: Past/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2015-01-01",
              end: "2030-01-02"
            },
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2015-01-01",
            end: "2030-01-02"
          },
          line: ["3 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home2", "Home1: None/None, Home2: Past/None(same start date), Home3: Past/Future(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2030-01-02"
            },
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home1", "Home1: None/None, Home2: None/None, Home3: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      /* -- Multiple All Active Temp Combinations -- */
      {
        description: ["Temp2", "Temp1: None/None, Temp2: Past/None(closest start date), Temp3: Past/Future"],
        addresses: [
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2015-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-02"
            },
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2015-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp3", "Temp1: None/None, Temp2: Past/None, Temp3: Past/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2015-01-01",
              end: "2030-01-02"
            },
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2015-01-01",
            end: "2030-01-02"
          },
          line: ["3 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp2", "Temp1: None/None, Temp2: Past/None(same start date), Temp3: Past/Future(same start date)"],
        addresses: [
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2030-01-02"
            },
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp1", "Temp1: None/None, Temp2: None/None, Temp3: None/None"],
        addresses: [
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Multiple All Active Mixed Use Combinations -- */
      {
        description: ["Temp2", "Home1: None/None, Home2: Past/None(closest start date), Temp1: None/None, Temp2: Past/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2015-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp2", "Home1: None/None, Home2: Past/None, Temp1: None/None, Temp2: Past/None(closest start date"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2015-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2015-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home2", "Home1: None/None, Home2: Past/None, Temp1: None/None, Temp2: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2015-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2015-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp1", "Home1: None/None, Home2: None/None, Temp1: None/None, Temp2: None/None"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Multiple All Future Mixed Use Combinations -- */
      {
        description: ["Home1", "Home1: Future/None(closest start date), Home2: Future/Future, Temp1: Future/None, Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home2", "Home1: Future/None, Home2: Future/Future(closest start date), Temp1: Future/None, Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp1", "Home1: Future/None, Home2: Future/Future, Temp1: Future/None(closest start date), Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp2", "Home1: Future/None, Home2: Future/Future, Temp1: Future/None, Temp2: Future/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home1", "Home1: Future/None(same closest start date), Home2: Future/Future(same closest start date), Temp1: Future/None, Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp1", "Home1: Future/None, Home2: Future/Future, Temp1: Future/None(same closest start date), Temp2: Future/Future(same closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp1", "Home1: Future/None(same closest start date), Home2: Future/Future, Temp1: Future/None(same closest start date), Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Multiple All Past Mixed Use Combinations -- */
      {
        description: ["Home1", "Home1: Past/Past(closest end date), Home2: Past/Past, Temp1: Past/Past, Temp2: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Home2", "Home1: Past/Past, Home2: Past/Past(closest end date), Temp1: Past/Past, Temp2: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp1", "Home1: Past/Past, Home2: Past/Past, Temp1: Past/Past(closest end date), Temp2: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp2", "Home1: Past/Past, Home2: Past/Past, Temp1: Past/Past, Temp2: Past/Past(closest end date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home1", "Home1: Past/Past(same closest end date), Home2: Past/Past(same closest end date), Temp1: Past/Past, Temp2: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp1", "Home1: Past/Past, Home2: Past/Past, Temp1: Past/Past(same closest end date), Temp2: Past/Past(same closest end date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Temp1", "Home1: Past/Past(same closest end date), Home2: Past/Past, Temp1: Past/Past(same closest end date), Temp2: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2009-01-01",
              end: "2010-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          line: ["1 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      /* -- Multiple Mixed Periods Mixed Use Combinations -- */
      {
        description: ["Home2", "Home1: Past/None, Home2: Past/Future(closest start date), Home3: Past/Past, Home4: Future/Future, Temp1: Past/Past, Temp2: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2011-01-01",
              end: "2030-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["4 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2011-01-01",
            end: "2030-01-01"
          },
          line: ["2 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp2", "Home1: Past/None, Home2: Past/Future, Temp1: Past/None, Temp2: Past/Future(closest start date, Temp3: Past/Past, Temp4: Future/Future"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2011-01-01",
              end: "2030-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2011-01-01",
              end: "2030-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["4 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2011-01-01",
            end: "2030-01-01"
          },
          line: ["2 Temp Address"],
          postalCode: "TE1 2MP"
        }
      },
      {
        description: ["Home3", "Home1: Past/Past, Home2: Future/Future, Home3: Future/None(closest start date), Temp1: Past/Past"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01",
              end: "2032-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2030-01-01"
            },
            line: ["3 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.HOME,
          period: {
            start: "2030-01-01"
          },
          line: ["3 Home Address"],
          postalCode: "HO1 2ME"
        }
      },
      {
        description: ["Temp3", "Home1: Past/Past, Home2: Future/None, Temp1: Past/Past, Temp2: Future/None, Temp3: Future/Future(closest start date)"],
        addresses: [
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.HOME,
            period: {
              start: "2031-01-01"
            },
            line: ["2 Home Address"],
            postalCode: "HO1 2ME"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2010-01-01",
              end: "2011-01-01"
            },
            line: ["1 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2031-01-01"
            },
            line: ["2 Temp Address"],
            postalCode: "TE1 2MP"
          },
          {
            use: PatientAddressUse.TEMP,
            period: {
              start: "2030-01-01",
              end: "2031-01-01"
            },
            line: ["3 Temp Address"],
            postalCode: "TE1 2MP"
          }
        ],
        expectedAddress: {
          use: PatientAddressUse.TEMP,
          period: {
            start: "2030-01-01",
            end: "2031-01-01"
          },
          line: ["3 Temp Address"],
          postalCode: "TE1 2MP"
        }
      }
    ]

    valueCombinationsTestCases.forEach((
      {description: [expectedDescription, combinationDescription], addresses, expectedAddress}) => {
      it(`returns ${expectedDescription} address when called with the combo of values; ${combinationDescription}`,
        async () => {
          const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
          mockPatient.address = addresses

          const result = parsePatient(mockPatient)
          expect(result.address).toEqual(expectedAddress.line)
          expect(result.postcode).toEqual(expectedAddress.postalCode)
        })
    })

    it("returns a n/a address when called with no Home or Temp address", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.BILLING,
        period: {
          start: "2010-01-01"
        },
        line: ["1 Home Address"],
        postalCode: "HO1 2ME"
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual(NOT_AVAILABLE)
    })

    it("returns a n/a address when called with no address field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      delete mockPatient.address

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual(NOT_AVAILABLE)
    })

    it("returns a n/a address when called with empty address array", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = []

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual(NOT_AVAILABLE)
    })

    it("returns a partial address when the most appropriate address has no address line field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.HOME,
        period: {
          start: "2010-01-01"
        },
        postalCode: "HO1 2ME"
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual("HO1 2ME")
    })

    it("returns a partial address when the most appropriate address has an empty address line array", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.HOME,
        period: {
          start: "2010-01-01"
        },
        line: [],
        postalCode: "HO1 2ME"
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual("HO1 2ME")
    })

    it("returns a partial address when the most appropriate address has an empty address array with only empty strings", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.HOME,
        period: {
          start: "2010-01-01"
        },
        line: ["", "", ""],
        postalCode: "HO1 2ME"
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(NOT_AVAILABLE)
      expect(result.postcode).toEqual("HO1 2ME")
    })

    it("returns a partial address when the most appropriate address has no post code field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.HOME,
        period: {
          start: "2010-01-01"
        },
        line: ["1 Home Address"]
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(["1 Home Address"])
      expect(result.postcode).toEqual(NOT_AVAILABLE)
    })

    it("returns a partial address when the most appropriate address has an empty post code field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.address = [{
        use: PatientAddressUse.HOME,
        period: {
          start: "2010-01-01"
        },
        line: ["1 Home Address"],
        postalCode: ""
      }]

      const result = parsePatient(mockPatient)
      expect(result.address).toEqual(["1 Home Address"])
      expect(result.postcode).toEqual(NOT_AVAILABLE)
    })
  })

  describe("Name parsing", () => {
    /* Note: The Bulk of the combination of use & period parsing logic for names is covered by the
    address parsing tests as both follow the same rules and use the same common code*/
    it("returns the most appropriate name when called with a single active usual name", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [
        {
          use: PatientNameUse.USUAL,
          period: {
            start: "2010-01-01"
          },
          given: ["Usual"],
          family: "Smith"
        },
        {
          use: PatientNameUse.TEMP,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          given: ["Temp"],
          family: "Smith"
        }
      ]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(["Usual"])
      expect(result.familyName).toEqual("Smith")
    })

    it("returns the most appropriate name when called with a single active temp name", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [
        {
          use: PatientNameUse.USUAL,
          period: {
            start: "2010-01-01",
            end: "2011-01-01"
          },
          given: ["Usual"],
          family: "Smith"
        },
        {
          use: PatientNameUse.TEMP,
          period: {
            start: "2010-01-01"
          },
          given: ["Temp"],
          family: "Smith"
        }
      ]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(["Temp"])
      expect(result.familyName).toEqual("Smith")
    })

    it("returns a n/a name when called with no Usual or Temp name", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [{
        use: PatientNameUse.NICKNAME,
        period: {
          start: "2010-01-01"
        },
        given: ["Jane"],
        family: "Smith"
      }]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(NOT_AVAILABLE)
      expect(result.familyName).toEqual(NOT_AVAILABLE)
    })

    it("returns a n/a name when called with no name field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      delete mockPatient.name

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(NOT_AVAILABLE)
      expect(result.familyName).toEqual(NOT_AVAILABLE)
    })

    it("returns a n/a name when called with empty name array", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = []

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(NOT_AVAILABLE)
      expect(result.familyName).toEqual(NOT_AVAILABLE)
    })

    it("returns a partial name when the most appropriate name has no given field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [{
        use: PatientNameUse.USUAL,
        period: {
          start: "2010-01-01"
        },
        family: "Smith"
      }]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(NOT_AVAILABLE)
      expect(result.familyName).toEqual("Smith")
    })

    it("returns a partial name when the most appropriate name has an empty given array", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [{
        use: PatientNameUse.USUAL,
        period: {
          start: "2010-01-01"
        },
        given: [],
        family: "Smith"
      }]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(NOT_AVAILABLE)
      expect(result.familyName).toEqual("Smith")
    })

    it("returns a partial name when the most appropriate name has no family field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [{
        use: PatientNameUse.USUAL,
        period: {
          start: "2010-01-01"
        },
        given: ["Jane"]
      }]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(["Jane"])
      expect(result.familyName).toEqual(NOT_AVAILABLE)
    })

    it("returns a partial name when the most appropriate name has an empty family field", async () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.name = [{
        use: PatientNameUse.USUAL,
        period: {
          start: "2010-01-01"
        },
        given: ["Jane"],
        family: ""
      }]

      const result = parsePatient(mockPatient)
      expect(result.givenName).toEqual(["Jane"])
      expect(result.familyName).toEqual(NOT_AVAILABLE)
    })
  })

  describe("All other fields parsing", () => {
    it("returns a nhs number when called", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient

      const result = parsePatient(mockPatient)
      expect(result.nhsNumber).toEqual("9000000009")
    })

    it("returns a gender when called", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient

      const result = parsePatient(mockPatient)
      expect(result.gender).toEqual("female")
    })

    it("returns a n/a gender when called with no gender field", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      delete mockPatient.gender

      const result = parsePatient(mockPatient)
      expect(result.gender).toEqual("n/a")
    })

    it("returns a n/a gender when with an empty gender field", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.gender = "" as PatientSummaryGender

      const result = parsePatient(mockPatient)
      expect(result.gender).toEqual("n/a")
    })

    it("returns a dob when called", () =>{
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient

      const result = parsePatient(mockPatient)
      expect(result.dateOfBirth).toEqual("2010-10-22")
    })

    it("returns a n/a dob when called with no dob field", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      delete mockPatient.birthDate

      const result = parsePatient(mockPatient)
      expect(result.dateOfBirth).toEqual("n/a")
    })

    it("returns a n/a dob when with an empty dob field", () => {
      const mockPatient = structuredClone(single_patient).entry[0].resource as UnrestrictedPatient
      mockPatient.birthDate = ""

      const result = parsePatient(mockPatient)
      expect(result.dateOfBirth).toEqual("n/a")
    })
  })
})

// TODO: test for if there only closest temp or home
