enum PostcodeFromStringOutcomeType {
  OK = "OK",
  // Cannot use wildcards in first 2 characters
  WILDCARD_TOO_SOON = "WILDCARD_TOO_SOON",
}

type PostcodeFromStringOutcome =
  | { type: PostcodeFromStringOutcomeType.OK, postcode: Postcode }
  | { type: PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON }

class Postcode {
  postcode: string
  private constructor(postcode: string) {
    this.postcode = postcode
  }

  static from_string(postcode: string): PostcodeFromStringOutcome {
    if (postcode.slice(0, 2).split("").includes("*")) {
      return {type: PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON}
    }

    return {type: PostcodeFromStringOutcomeType.OK, postcode: new Postcode(postcode)}
  }

  public to_query_string(): string {
    return this.postcode
      .replaceAll(" ", "%20")
      .replaceAll("*", "%2A")
  }
}

export {
  PostcodeFromStringOutcomeType,
  PostcodeFromStringOutcome,
  Postcode
}
