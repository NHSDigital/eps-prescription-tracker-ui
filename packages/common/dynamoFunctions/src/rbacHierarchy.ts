interface ActivityCode {
  baselineRoleCodes: Array<string>
  childActivityCodes: Record<string, ActivityCode>
}

export interface RBACHierarchy {
  [key: string]: ActivityCode
}

//--B0570 derived codes - Perform Pharmacy Activities
const B0571: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {}
}

const B0572: ActivityCode = {
  baselineRoleCodes: [
    "R8003", "R8008"
  ],
  childActivityCodes: {}
}

const B0570: ActivityCode = {
  baselineRoleCodes: [
    "R8004"
  ],
  childActivityCodes: {
    B0571, B0572
  }
}
//--B0278 derived codes - Perform Prescription Preparation
const B0058: ActivityCode = {
  baselineRoleCodes: ["R8008"],
  childActivityCodes: {}
}

const B0420: ActivityCode = {
  baselineRoleCodes: [
    "R0260", "R0270", "R6200", "R6300", "R1547",
    "R8000"
  ],
  childActivityCodes: {}
}

const B0440: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {}
}

const B0278: ActivityCode = {
  baselineRoleCodes: [
    "R0260", "R0270", "R6200", "R6300", "R1547",
    "R8001", "R8002", "R0011", "R1560", "R1730",
    "R1740", "R1760"
  ],
  childActivityCodes: {
    B0058, B0420, B0440
  }
}

//--B0401 derived codes - View Patient Medication
const B0055: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {}
}

const B8029: ActivityCode = {
  baselineRoleCodes: [
    "R8000"
  ],
  childActivityCodes: {}
}

const B8028: ActivityCode = {
  baselineRoleCodes: [
    "R8000", "R8002"
  ],
  childActivityCodes: {
    B8029
  }
}

const B0380: ActivityCode = {
  baselineRoleCodes: [
    "R0260", "R0270", "R6200", "R6300", "R0620",
    "R0630", "R0690", "R0700", "R0680", "R0018",
    "R0750", "R0790", "R0950", "R1110", "R0955",
    "R1540", "R1543", "R1547", "R1590", "R8001",
    "R8002", "R8003", "R8016", "R8017", "R8006",
    "R8008", "R8014"
  ],
  childActivityCodes: {
    B0055, B8028
  }
}

const B0800: ActivityCode = {
  baselineRoleCodes: [
    "R8007", "R1984", "R6050", "R5007", "R6020",
    "R6070", "R7130", "R8013"

  ],
  childActivityCodes: {}
}

const B0790: ActivityCode = {
  baselineRoleCodes: [
    "R0018", "R0750", "R0760", "R0770", "R0780",
    "R0790", "R0800", "R0810", "R0820", "R0950",
    "R0960", "R0970", "R0980", "R0990", "R1000",
    "R1010", "R1020", "R1110", "R1120", "R1130",
    "R1140", "R1070", "R1080", "R1090", "R1100",
    "R1190", "R1200", "R1210", "R1220", "R1230",
    "R1240", "R1250", "R1260", "R1030", "R1040",
    "R1050", "R1060", "R1150", "R1160", "R1170",
    "R1180", "R0710", "R0720", "R0730", "R0740",
    "R0830", "R0840", "R0850", "R0860", "R0870",
    "R0880", "R0890", "R0900", "R0910", "R0920",
    "R0930", "R0940", "R0955", "R0965", "R0975",
    "R0985", "R1280", "R1290", "R1300", "R1310",
    "R1390", "R1500", "R1510", "R6050", "R1982",
    "R1985", "R6060"
  ],
  childActivityCodes: {
    B0380, B0800
  }
}

const B0064: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {}
}

const B1694: ActivityCode = {
  baselineRoleCodes: [
    "R8000", "R8001", "R8002", "R8003", "R8014"
  ],
  childActivityCodes: {
    B0064
  }
}

const B1693: ActivityCode = {
  baselineRoleCodes: [
    "R8004", "R8006", "R8007", "R8008", "R8010",
    "R8011", "R8013"
  ],
  childActivityCodes: {
    B1694
  }
}

const B0071: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {}
}

const B1692: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {
    B0071
  }
}

const B0066: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {
    B1692
  }
}

const B1690: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {
    B0380
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const B0360: ActivityCode = {
  baselineRoleCodes: [
    "R0330", "R0340", "R0350", "R0360", "R0370",
    "R0380", "R0390", "R0400", "R0410", "R0420",
    "R0430", "R0440", "R0450", "R0460", "R0470",
    "R0480", "R0490", "R0500", "R0510", "R0520",
	  "R0530", "R0550", "R6400", "R0580", "R0630",
    "R1540", "R1550", "R1480", "R1590", "R1630",
	  "R1660", "R8004", "R8005", "R8014"
  ],
  childActivityCodes: {
    B0790, B1693, B0066, B1690
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const B0069: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {
    B0380
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const B0422: ActivityCode = {
  baselineRoleCodes: [
    "R0600", "R0690", "R0700", "R1540", "R8002"
  ],
  childActivityCodes: {
    B0278
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const B0468: ActivityCode = {
  baselineRoleCodes: [],
  childActivityCodes: {
    B0278
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const B0429: ActivityCode = {
  baselineRoleCodes: [
    "R1290"
  ],
  childActivityCodes: {}
}

const B0401: ActivityCode = {
  baselineRoleCodes: [
    "R0260", "R0270", "R6200", "R6300", "R0370",
    "R0380", "R0390", "R0400", "R0410", "R6400",
    "R0600", "R0620", "R0630", "R0690", "R0700",
    "R0680", "R0018", "R0750", "R0760", "R0770",
    "R0780", "R0790", "R0800", "R0810", "R0820",
    "R0950", "R0960", "R0970", "R0980", "R1110",
    "R1120", "R1130", "R1140", "R0955", "R0965",
    "R0975", "R0985", "R1290", "R1540", "R1543",
    "R1547", "R1720", "R1730", "R1740", "R1760",
    "R1770"
  ],
  // Don't accept B0401 child codes until wider scope of them is ok'ed
  childActivityCodes: {
    // B0360, B0069, B0422, B0468, B0429
  }
}

export const rbacHierarchy: RBACHierarchy = {B0570, B0278, B0401}

const extractAccessCodes = (activityCode: ActivityCode): Array<Array<string>> => {
  let acceptedRoleCodes: Array<string> = []
  let acceptedActivityCodes: Array<string> = []

  acceptedRoleCodes.push(...activityCode.baselineRoleCodes)
  for (const [childActivityCode, ChildActivityCodeInfo] of Object.entries(activityCode.childActivityCodes)){
    const [grandChildRoleCodes, grandChildActivityCodes] = extractAccessCodes(ChildActivityCodeInfo)
    acceptedRoleCodes.push(...grandChildRoleCodes)
    acceptedActivityCodes.push(childActivityCode, ...grandChildActivityCodes)
  }

  return [acceptedRoleCodes, acceptedActivityCodes]
}

export const extractAccessCodesFromHierarchy = (rbacHierarchy: RBACHierarchy) => {
  let allAcceptedRoleCodes: Array<string> = []
  let allAcceptedActivityCodes: Array<string> = []

  for(const [activityCode, activityCodeInfo] of Object.entries(rbacHierarchy)){
    const [childRoleCodes, childActivityCodes] = extractAccessCodes(activityCodeInfo)
    allAcceptedRoleCodes.push(...childRoleCodes)
    allAcceptedActivityCodes.push(activityCode, ...childActivityCodes)
  }

  // dedupe lists
  allAcceptedRoleCodes = [...new Set(allAcceptedRoleCodes)]
  allAcceptedActivityCodes = [...new Set(allAcceptedActivityCodes)]

  return [allAcceptedRoleCodes, allAcceptedActivityCodes]
}
