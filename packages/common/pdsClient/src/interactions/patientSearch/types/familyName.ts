enum FamilyNameFromStringOutcomeType {
  OK = "OK",
  // 35 character limit
  TOO_LONG = "TOO_LONG",
  // Cannot use wildcards in first 2 characters
  WILDCARD_TOO_SOON = "WILDCARD_TOO_SOON",
}

type FamilyNameFromStringOutcome =
  | { type: FamilyNameFromStringOutcomeType.OK, familyName: familyName }
  | { type: FamilyNameFromStringOutcomeType.TOO_LONG }
  | { type: FamilyNameFromStringOutcomeType.WILDCARD_TOO_SOON }

class familyName {
  family: string
  private constructor(family: string) {
    this.family = family
  }

  static from_string(family: string): FamilyNameFromStringOutcome {
    if (family.length > 35) {
      return {type: FamilyNameFromStringOutcomeType.TOO_LONG}
    }

    if (family[0] === "*" || family[1] === "*") {
      return {type: FamilyNameFromStringOutcomeType.WILDCARD_TOO_SOON}
    }

    return {type: FamilyNameFromStringOutcomeType.OK, familyName: new familyName(family)}
  }

  public to_query_string(): string {
    return this.family
      .replaceAll(" ", "%20")
      .replaceAll("*", "%2A")
  }
}

export {
  FamilyNameFromStringOutcomeType,
  FamilyNameFromStringOutcome,
  familyName
}
