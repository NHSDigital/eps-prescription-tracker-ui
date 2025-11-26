/* eslint-disable max-len */
import {jest} from "@jest/globals"

import {getActive} from "../src/parsePatient"
import {PatientAddress, PatientAddressUse} from "../src/schema/address"

interface UseCombinationTestCase {
  description: Array<string>
  addresses: Array<PatientAddress>,
  expectedAddress: PatientAddress
}

describe("test parsePatient getActive", () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01"))
  })

  afterAll(() => {
    jest.setSystemTime(jest.getRealSystemTime())
    jest.useRealTimers()
  })

  const useCombinationsTestCases: Array<UseCombinationTestCase> = [
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
    /* -- Multiple All Active Home Combinations-- */
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
    /* -- Multiple All Active Temp Combinations-- */
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
    /* -- Multiple All Active Mixed Combinations-- */
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
    /* -- Multiple All Future Mixed Combinations-- */
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
    }
    // TODO: home2 closest, temp 1 closest, temp 2 closest, home 1/2 same, temp 1/2 same, home/temp same
  ]

  useCombinationsTestCases.forEach((
    {description: [expectedDescription, combinationDescription], addresses, expectedAddress}) => {
    it(`returns ${expectedDescription} address when called with the combo of values; ${combinationDescription}`,
      async () => {
        const result = getActive<PatientAddress>(
          addresses, {main: PatientAddressUse.HOME, temp: PatientAddressUse.TEMP})
        expect(result).toEqual(expectedAddress)
      })
  })
})
