import {encodeQueryString} from "../utils"

enum NameFromStringOutcomeType {
  OK = "OK",
  // 35 character limit
  TOO_LONG = "TOO_LONG",
  // Cannot use wildcards in first 2 characters
  WILDCARD_TOO_SOON = "WILDCARD_TOO_SOON",
}

type NameFromStringOutcome =
  | { type: NameFromStringOutcomeType.OK, Name: Name }
  | { type: NameFromStringOutcomeType.TOO_LONG }
  | { type: NameFromStringOutcomeType.WILDCARD_TOO_SOON }

class Name {
  name: string
  private constructor(name: string) {
    this.name = name
  }

  static from_string(name: string): NameFromStringOutcome {
    if (name.length > 35) {
      return {type: NameFromStringOutcomeType.TOO_LONG}
    }

    if (name.slice(0, 2).includes("*")) {
      return {type: NameFromStringOutcomeType.WILDCARD_TOO_SOON}
    }

    return {type: NameFromStringOutcomeType.OK, Name: new Name(name)}
  }

  public to_query_string(): string {
    return encodeQueryString(this.name)
  }
}

export {
  NameFromStringOutcomeType,
  NameFromStringOutcome,
  Name
}
