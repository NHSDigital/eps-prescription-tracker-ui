enum DateOfBirthFromStringOutcomeType {
  OK = "OK",
  BAD_FORMAT = "BAD_FORMAT",
  INVALID_DATE = "INVALID_DATE",
}

type DateOfBirthFromStringOutcome =
  | { type: DateOfBirthFromStringOutcomeType.OK, dateOfBirth: dateOfBirth }
  | { type: DateOfBirthFromStringOutcomeType.BAD_FORMAT }
  | { type: DateOfBirthFromStringOutcomeType.INVALID_DATE }

class dateOfBirth {
  date: string
  private constructor(date: string) {
    this.date = date
  }

  static from_string(date: string): DateOfBirthFromStringOutcome {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return {type: DateOfBirthFromStringOutcomeType.BAD_FORMAT}
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return {type: DateOfBirthFromStringOutcomeType.INVALID_DATE}
    }

    return {type: DateOfBirthFromStringOutcomeType.OK, dateOfBirth: new dateOfBirth(date)}
  }

  public to_query_string(): string {
    return this.date
  }
}

export {
  DateOfBirthFromStringOutcomeType,
  DateOfBirthFromStringOutcome,
  dateOfBirth
}
