import React, {useState, useEffect, useRef} from "react"
import {
  Container,
  Row,
  Col,
  Form,
  FormGroup,
  Label,
  HintText,
  TextInput,
  Button,
  ErrorSummary,
  ErrorMessage,
  Fieldset
} from "nhsuk-react-components"
import {useNavigate} from "react-router-dom"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {validateBasicDetails} from "@/helpers/validateBasicDetails"
import {errorFocusMap, ErrorKey} from "@/helpers/basicDetailsValidationMeta"

// Temporary mock data used for frontend search simulation
const mockPatients = [
  {
    given: "Issac",
    family: "Wolderton-Rodriguez",
    dateOfBirth: "06-05-2013",
    postCode: "LS6 1JL"
  },
  {
    given: "Steve",
    family: "Wolderton-Rodriguez",
    dateOfBirth: "06-05-2013",
    postCode: "LS6 1JL"
  }
]

// Normalise input for case-insensitive and whitespace-tolerant comparisons
const formatInput = (input: string) => input.trim().toLowerCase()

export default function BasicDetailsSearch() {
  const navigate = useNavigate()
  const errorRef = useRef<HTMLDivElement | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [postcode, setPostcode] = useState("")
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")
  const [errors, setErrors] = useState<Array<ErrorKey>>([])

  const {errors: errorMessages} = STRINGS

  useEffect(() => {
    document.querySelector<HTMLInputElement>("#last-name")?.focus()
  }, [])

  useEffect(() => {
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errors])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate input fields
    const newErrors = validateBasicDetails({
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    // Combine and format DOB input
    const searchDob = `${dobDay.padStart(2, "0")}-${dobMonth.padStart(2, "0")}-${dobYear}`

    // FIXME: This is temporary logic for front-end demo/testing only.
    // Replace with real backend call once NHS number search is implemented server-side.
    const matchedPatients = mockPatients.filter(p => {
      const matchFirstName = firstName
        ? formatInput(p.given) === formatInput(firstName)
        : true
      const matchLastName = formatInput(p.family) === formatInput(lastName)
      const matchDob = p.dateOfBirth === searchDob
      const matchPostcode = postcode
        ? formatInput(p.postCode) === formatInput(postcode)
        : true
      return matchFirstName && matchLastName && matchDob && matchPostcode
    })

    if (matchedPatients.length > 0) {
      navigate(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS, {
        state: {patients: matchedPatients}
      })
    } else {
      navigate(FRONTEND_PATHS.SEARCH_RESULTS_TOO_MANY, {
        state: {
          firstName,
          lastName,
          dob: searchDob,
          postcode
        }
      })
    }
  }

  // Utility to check if any of a list of error keys are present
  const hasError = (keys: Array<ErrorKey>) => keys.some(key => errors.includes(key))

  // Get first DOB error for inline display
  const dobErrorKey = errors.find(e => e.startsWith("dob"))
  const dobError = dobErrorKey ? errorMessages[dobErrorKey] : null

  return (
    <Container className="nhsuk-width-container-fluid" data-testid="basic-details-search-form-container">
      <Row className="patient-search-form">
        <Col width="three-quarters">
          <Form onSubmit={handleSubmit} noValidate data-testid="basic-details-form">
            {errors.length > 0 && (
              <ErrorSummary ref={errorRef} data-testid="error-summary">
                <ErrorSummary.Title>{STRINGS.errorSummaryHeading}</ErrorSummary.Title>
                <ErrorSummary.Body>
                  <ErrorSummary.List>
                    {errors.map(error => (
                      <ErrorSummary.Item key={error}>
                        <a href={`#${errorFocusMap[error] ?? "basic-details-search-heading"}`}>
                          {errorMessages[error]}
                        </a>
                      </ErrorSummary.Item>
                    ))}
                  </ErrorSummary.List>
                </ErrorSummary.Body>
              </ErrorSummary>
            )}

            <FormGroup data-testid="field-group">
              <h2
                className="nhsuk-heading-m nhsuk-u-margin-bottom-3 no-outline"
                id="basic-details-search-heading"
                tabIndex={-1}
                data-testid="basic-details-search-heading"
              >
                <span className="nhsuk-u-visually-hidden">
                  {STRINGS.visuallyHiddenPrefix}
                </span>
                {STRINGS.heading}
              </h2>
              <p data-testid="intro-text">{STRINGS.introText}</p>

              {/* First Name */}
              <FormGroup className={hasError(["firstNameTooLong", "firstNameInvalidChars"])
                ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="first-name" data-testid="first-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.firstNameLabel}
                  </h3>
                </Label>
                {errors.includes("firstNameTooLong") && (
                  <ErrorMessage>{errorMessages.firstNameTooLong}</ErrorMessage>
                )}
                {errors.includes("firstNameInvalidChars") && (
                  <ErrorMessage>{errorMessages.firstNameInvalidChars}</ErrorMessage>
                )}
                <TextInput
                  id="first-name"
                  name="first-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`nhsuk-input--width-20 ${hasError(["firstNameTooLong", "firstNameInvalidChars"])
                    ? "nhsuk-input--error" : ""}`}
                  data-testid="first-name-input"
                />
              </FormGroup>

              {/* Last Name */}
              <FormGroup className={hasError(["lastNameRequired", "lastNameTooLong", "lastNameInvalidChars"])
                ? "nhsuk-form-group--error"
                : ""}>
                <Label htmlFor="last-name" data-testid="last-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.lastNameLabel}
                  </h3>
                </Label>
                {errors.includes("lastNameRequired") && (
                  <ErrorMessage>{errorMessages.lastNameRequired}</ErrorMessage>
                )}
                {errors.includes("lastNameTooLong") && (
                  <ErrorMessage>{errorMessages.lastNameTooLong}</ErrorMessage>
                )}
                {errors.includes("lastNameInvalidChars") && (
                  <ErrorMessage>{errorMessages.lastNameInvalidChars}</ErrorMessage>
                )}
                <TextInput
                  id="last-name"
                  name="last-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`nhsuk-input--width-20 ${hasError([
                    "lastNameRequired",
                    "lastNameTooLong",
                    "lastNameInvalidChars"])
                    ? "nhsuk-input--error" : ""}`}
                  data-testid="last-name-input"
                />
              </FormGroup>

              {/* Date of Birth */}
              <FormGroup className={errors.some(e => e.startsWith("dob"))
                ? "nhsuk-form-group nhsuk-form-group--error"
                : "nhsuk-form-group"}>
                <Fieldset role="group" aria-labelledby="dob-label">
                  <Fieldset.Legend
                    className="nhsuk-fieldset__legend nhsuk-fieldset__legend--s"
                    id="dob-label"
                    data-testid="dob-label"
                  >
                    <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                      {STRINGS.dobLabel}
                    </h3>
                  </Fieldset.Legend>
                  <HintText id="dob-hint" data-testid="dob-hint">
                    {STRINGS.dobHint}
                  </HintText>

                  {dobError && <ErrorMessage>{dobError}</ErrorMessage>}

                  <div className="nhsuk-date-input" id="dob" data-testid="dob-input-group">
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label htmlFor="dob-day" className="nhsuk-label nhsuk-date-input__label">
                          {STRINGS.dobDay}
                        </Label>
                        <TextInput
                          id="dob-day"
                          name="dob-day"
                          value={dobDay}
                          onChange={e => setDobDay(e.target.value)}
                          className={`nhsuk-date-input__input nhsuk-input--width-2 ${hasError([
                            "dobDayRequired",
                            "dobInvalidDate",
                            "dobNonNumericDay"])
                            ? "nhsuk-input--error" : ""}`}
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-day-input"
                        />
                      </FormGroup>
                    </div>
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label htmlFor="dob-month" className="nhsuk-label nhsuk-date-input__label">
                          {STRINGS.dobMonth}
                        </Label>
                        <TextInput
                          id="dob-month"
                          name="dob-month"
                          value={dobMonth}
                          onChange={e => setDobMonth(e.target.value)}
                          className={`nhsuk-date-input__input nhsuk-input--width-2 ${hasError([
                            "dobMonthRequired",
                            "dobInvalidDate",
                            "dobNonNumericMonth"])
                            ? "nhsuk-input--error" : ""}`}
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-month-input"
                        />
                      </FormGroup>
                    </div>
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label htmlFor="dob-year" className="nhsuk-label nhsuk-date-input__label">
                          {STRINGS.dobYear}
                        </Label>
                        <TextInput
                          id="dob-year"
                          name="dob-year"
                          value={dobYear}
                          onChange={e => setDobYear(e.target.value)}
                          className={`nhsuk-date-input__input nhsuk-input--width-4 ${hasError([
                            "dobYearRequired",
                            "dobInvalidDate",
                            "dobNonNumericYear",
                            "dobYearTooShort"
                          ])
                            ? "nhsuk-input--error" : ""}`}
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-year-input"
                        />
                      </FormGroup>
                    </div>
                  </div>
                </Fieldset>
              </FormGroup>

              {/* Postcode */}
              <FormGroup className={hasError(["postcodeTooShort", "postcodeInvalidChars"])
                ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="postcode-only" data-testid="postcode-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.postcodeLabel}
                  </h3>
                </Label>
                <HintText id="postcode-hint" data-testid="postcode-hint">
                  {STRINGS.postcodeHint}
                </HintText>
                {errors.includes("postcodeTooShort") && (
                  <ErrorMessage>{errorMessages.postcodeTooShort}</ErrorMessage>
                )}
                {errors.includes("postcodeInvalidChars") && (
                  <ErrorMessage>{errorMessages.postcodeInvalidChars}</ErrorMessage>
                )}
                <TextInput
                  id="postcode-only"
                  name="postcode-only"
                  value={postcode}
                  onChange={e => setPostcode(e.target.value)}
                  className={`nhsuk-input--width-10 ${hasError(["postcodeTooShort", "postcodeInvalidChars"])
                    ? "nhsuk-input--error" : ""}`}
                  data-testid="postcode-input"
                />
              </FormGroup>
            </FormGroup>

            <Button id="basic-details-submit" type="submit" data-testid="find-patient-button">
              {STRINGS.buttonText}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}
