import {extractAccessCodesFromHierarchy, RBACHierarchy} from "../src/rbacHierarchy"

const mockRbacHierarchy: RBACHierarchy = {
  B1000: {
    baselineRoleCodes: ["R1000", "R2000", "R3000"],
    childActivityCodes: {
      B1100: {
        baselineRoleCodes: ["R1100"],
        childActivityCodes: {
          B1110: {
            baselineRoleCodes: ["R1110", "R1120"],
            childActivityCodes: {
              B1111: {
                baselineRoleCodes: [],
                childActivityCodes: {}
              }
            }
          },
          B1120: {
            baselineRoleCodes: [],
            childActivityCodes: {}
          }
        }
      },
      B1200: {
        baselineRoleCodes: ["R2000", "R2200"],
        childActivityCodes: {}
      },
      B1300: {
        baselineRoleCodes: [],
        childActivityCodes: {
          B1310: {
            baselineRoleCodes: ["R3001", "R3002"],
            childActivityCodes: {}
          }
        }
      }
    }
  },
  B2000: {
    baselineRoleCodes: ["R2000", "R4000"],
    childActivityCodes: {
      B2100: {
        baselineRoleCodes: ["R3002"],
        childActivityCodes: {}
      }
    }
  },
  B3000: {
    baselineRoleCodes: ["R2200", "R5000"],
    childActivityCodes: {
      B3100: {
        baselineRoleCodes: ["R5001"],
        childActivityCodes: {
          B1110: {
            baselineRoleCodes: ["R1110", "R1120"],
            childActivityCodes: {
              B1111: {
                baselineRoleCodes: [],
                childActivityCodes: {}
              }
            }
          }
        }
      }
    }
  }
}

describe("Extract Access Codes From Hierarchy", () => {
  it("should return flattened deduped lists of role and activity codes when called with a RBAC hierarchy", () => {
    const expectedRoleCodes = [
      "R1000", "R2000", "R3000", "R1100", "R1110", "R1120", "R2200", "R3001", "R3002", "R4000", "R5000", "R5001"
    ]
    const expectedActivityCodes = [
      "B1000", "B1100", "B1110", "B1111", "B1120", "B1200", "B1300", "B1310", "B2000", "B2100", "B3000", "B3100"
    ]

    const [actualRoleCodes, actualActivityCodes] = extractAccessCodesFromHierarchy(mockRbacHierarchy)
    expect(actualRoleCodes).toEqual(expectedRoleCodes)
    expect(actualActivityCodes).toEqual(expectedActivityCodes)
  })
})
