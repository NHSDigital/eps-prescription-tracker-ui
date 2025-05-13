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
import {API_ENDPOINTS, FRONTEND_PATHS} from "@/constants/environment"
import {validateBasicDetails, getInlineErrors} from "@/helpers/validateBasicDetails"
import {errorFocusMap, ErrorKey} from "@/helpers/basicDetailsValidationMeta"

// Temporary mock data used for frontend search simulation
const mockPatient = [
  {
    nhsNumber: "1234567890",
    given: "James",
    family: "Smith",
    dateOfBirth: "02-04-2006",
    postCode: "LS1 1AB"
  }
]

const mockMultiplePatient = [
  {
    nhsNumber: "9726919207",
    given: "Issac",
    family: "Wolderton-Rodriguez",
    dateOfBirth: "06-05-2013",
    postCode: "LS6 1JL"
  },
  {
    nhsNumber: "9726919207",
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

  const inlineErrors = getInlineErrors(errors)
  const getInlineError = (field: string) => inlineErrors.find(([key]) => key === field)?.[1]

  useEffect(() => {
    document.querySelector<HTMLInputElement>("#last-name")?.focus()
  }, [])

  useEffect(() => {
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errors])

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      // Call backend API (not implemented yet, expect failure)
      await fetch(API_ENDPOINTS.PATIENT_SEARCH, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          firstName,
          lastName,
          dob: searchDob,
          postcode
        })
      })

      // If it works, this code won't run because the API is not ready
      throw new Error("Backend not implemented")
    } catch (err) {
      console.error("Failed to fetch patient details. Using mock data fallback.", err)

      // FIXME: This is temporary logic for front-end demo/testing only.
      // Replace with real backend call once NHS number search is implemented server-side.
      const allMocks = [...mockPatient, ...mockMultiplePatient]

      const matchedPatients = allMocks.filter(p => {
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

      if (matchedPatients.length === 1) {
        navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${matchedPatients[0].nhsNumber}`)
      } else if (matchedPatients.length > 1) {
        navigate(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS, {
          state: {patients: matchedPatients}
        })
      } else {
        navigate(FRONTEND_PATHS.SEARCH_RESULTS_TOO_MANY, {
          state: {firstName, lastName, dob: searchDob, postcode}
        })
      }
    }
  }

  return (
    <Container className="nhsuk-width-container-fluid" data-testid="basic-details-search-form-container">
      <Row className="patient-search-form">
        <Col width="three-quarters">
          <Form onSubmit={handleSubmit} noValidate data-testid="basic-details-form">
            {inlineErrors.length > 0 && (
              <ErrorSummary ref={errorRef} data-testid="error-summary">
                <ErrorSummary.Title>{STRINGS.errorSummaryHeading}</ErrorSummary.Title>
                <ErrorSummary.Body>
                  <ErrorSummary.List>
                    {inlineErrors.map(([key, message]) => (
                      <ErrorSummary.Item key={key}>
                        <a href={`#${errorFocusMap[key] ?? "basic-details-search-heading"}`}>
                          {message}
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
              <FormGroup className={getInlineError("firstName") ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="first-name" data-testid="first-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.firstNameLabel}
                  </h3>
                </Label>
                {getInlineError("firstName") && <ErrorMessage>{getInlineError("firstName")}</ErrorMessage>}
                <TextInput
                  id="first-name"
                  name="first-name"
                  value={firstName}
                  onChange={e => setFirstName((e.target as HTMLInputElement).value)}
                  className={`nhsuk-input--width-20 ${getInlineError("firstName") ? "nhsuk-input--error" : ""}`}
                  data-testid="first-name-input"
                />
              </FormGroup>

              {/* Last Name */}
              <FormGroup className={getInlineError("lastName") ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="last-name" data-testid="last-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.lastNameLabel}
                  </h3>
                </Label>
                {getInlineError("lastName") && <ErrorMessage>{getInlineError("lastName")}</ErrorMessage>}
                <TextInput
                  id="last-name"
                  name="last-name"
                  value={lastName}
                  onChange={e => setLastName((e.target as HTMLInputElement).value)}
                  className={`nhsuk-input--width-20 ${getInlineError("lastName") ? "nhsuk-input--error" : ""}`}
                  data-testid="last-name-input"
                />
              </FormGroup>

              {/* Date of Birth */}
              <FormGroup className={getInlineError("dob") ? "nhsuk-form-group--error" : ""}>
                <Fieldset role="group" aria-labelledby="dob-label">
                  <Fieldset.Legend className="nhsuk-fieldset__legend--s"
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
                  {getInlineError("dob") && <ErrorMessage>{getInlineError("dob")}</ErrorMessage>}
                  <div className="nhsuk-date-input" id="dob" data-testid="dob-input-group">
                    <div className="nhsuk-date-input__item">
                      <Label htmlFor="dob-day" className="nhsuk-label nhsuk-date-input__label">{STRINGS.dobDay}</Label>
                      <TextInput
                        id="dob-day"
                        name="dob-day"
                        value={dobDay}
                        onChange={e => setDobDay((e.target as HTMLInputElement).value)}
                        className={`nhsuk-date-input__input nhsuk-input--width-2 ${getInlineError("dob")
                          ? "nhsuk-input--error" : ""}`}
                        data-testid="dob-day-input"
                      />
                    </div>
                    <div className="nhsuk-date-input__item">
                      <Label htmlFor="dob-month" className="nhsuk-label nhsuk-date-input__label">
                        {STRINGS.dobMonth}
                      </Label>
                      <TextInput
                        id="dob-month"
                        name="dob-month"
                        value={dobMonth}
                        onChange={e => setDobMonth((e.target as HTMLInputElement).value)}
                        className={`nhsuk-date-input__input nhsuk-input--width-2 ${getInlineError("dob")
                          ? "nhsuk-input--error" : ""}`}
                        data-testid="dob-month-input"
                      />
                    </div>
                    <div className="nhsuk-date-input__item">
                      <Label htmlFor="dob-year" className="nhsuk-label nhsuk-date-input__label">
                        {STRINGS.dobYear}
                      </Label>
                      <TextInput
                        id="dob-year"
                        value={dobYear}
                        onChange={e => setDobYear((e.target as HTMLInputElement).value)}
                        className={`nhsuk-date-input__input nhsuk-input--width-4 ${getInlineError("dob")
                          ? "nhsuk-input--error" : ""}`}
                        data-testid="dob-year-input"
                      />
                    </div>
                  </div>
                </Fieldset>
              </FormGroup>

              {/* Postcode */}
              <FormGroup className={getInlineError("postcode") ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="postcode-only"><h3 className="nhsuk-heading-s">{STRINGS.postcodeLabel}</h3></Label>
                <HintText>{STRINGS.postcodeHint}</HintText>
                {getInlineError("postcode") && <ErrorMessage>{getInlineError("postcode")}</ErrorMessage>}
                <TextInput
                  id="postcode-only"
                  name="postcode-only"
                  value={postcode}
                  onChange={e => setPostcode((e.target as HTMLInputElement).value)}
                  className={`nhsuk-input--width-10 ${getInlineError("postcode") ? "nhsuk-input--error" : ""}`}
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
