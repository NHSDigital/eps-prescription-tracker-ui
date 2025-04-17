enum PostcodeFromStringOutcomeType {
  OK = "OK",
  // Cannot use wildcards in first 2 characters
  WILDCARD_TOO_SOON = "WILDCARD_TOO_SOON",
}

type PostcodeFromStringOutcome =
  | { type: PostcodeFromStringOutcomeType.OK, postcode: postcode }
  | { type: PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON }

class postcode {
  postcode: string
  private constructor(postcode: string) {
    this.postcode = postcode
  }

  static from_string(_postcode: string): PostcodeFromStringOutcome {
    if (_postcode[0] === "*" || _postcode[1] === "*") {
      return {type: PostcodeFromStringOutcomeType.WILDCARD_TOO_SOON}
    }

    return {type: PostcodeFromStringOutcomeType.OK, postcode: new postcode(_postcode)}
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
  postcode
}
