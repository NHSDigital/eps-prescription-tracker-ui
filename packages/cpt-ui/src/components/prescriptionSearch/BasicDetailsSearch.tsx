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

type ErrorKey = keyof typeof STRINGS.errors

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
    const newErrors: Array<ErrorKey> = []

    if (!lastName.trim()) newErrors.push("lastNameRequired")
    if (!dobDay.trim() || !dobMonth.trim() || !dobYear.trim()) newErrors.push("dobRequired")
    if (firstName.length > 35) newErrors.push("firstNameTooLong")
    if (lastName.length > 35) newErrors.push("lastNameTooLong")

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    // FIXME: This is temporary logic for front-end demo/testing only.
    // Replace with real backend call once NHS number search is implemented server-side.
    const formatInput = (input: string) => input.trim().toLowerCase()

    const searchDob = `${dobDay.padStart(2, "0")}-${dobMonth.padStart(2, "0")}-${dobYear}`

    const matchedPatients = mockPatients.filter(p => {
      const matchFirstName = firstName ? formatInput(p.given) === formatInput(firstName) : true
      const matchLastName = formatInput(p.family) === formatInput(lastName)
      const matchDob = p.dateOfBirth === searchDob
      const matchPostcode = postcode ? formatInput(p.postCode) === formatInput(postcode) : true
      return matchFirstName && matchLastName && matchDob && matchPostcode
    })

    if (matchedPatients.length > 0) {
      // Show real matches (mock only)
      navigate(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS, {
        state: {patients: matchedPatients}
      })
    } else {
      // Valid form submission but no matches show "Too many results" suggestion
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
                        <a href="#basic-details-search-heading">{errorMessages[error]}</a>
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
                <span className="nhsuk-u-visually-hidden">{STRINGS.visuallyHiddenPrefix}</span>
                {STRINGS.heading}
              </h2>
              <p data-testid="intro-text">{STRINGS.introText}</p>

              <FormGroup>
                <Label htmlFor="first-name" data-testid="first-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.firstNameLabel}
                  </h3>
                </Label>
                <TextInput
                  id="first-name"
                  name="first-name"
                  value={firstName}
                  onChange={e => setFirstName((e.target as HTMLInputElement).value)}
                  className="nhsuk-input--width-20"
                  maxLength={35}
                  data-testid="first-name-input"
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="last-name" data-testid="last-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.lastNameLabel}
                  </h3>
                </Label>
                {errors.includes("lastNameRequired") && (
                  <ErrorMessage>{errorMessages.lastNameRequired}</ErrorMessage>
                )}
                <TextInput
                  id="last-name"
                  name="last-name"
                  value={lastName}
                  onChange={e => setLastName((e.target as HTMLInputElement).value)}
                  className="nhsuk-input--width-20"
                  maxLength={35}
                  data-testid="last-name-input"
                />
              </FormGroup>

              <FormGroup>
                <Fieldset role="group" aria-labelledby="dob-label">
                  <Fieldset.Legend
                    className="nhsuk-fieldset__legend nhsuk-fieldset__legend--s"
                    id="dob-label"
                    data-testid="dob-label">
                    <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                      {STRINGS.dobLabel}
                    </h3>
                  </Fieldset.Legend>
                  <HintText id="dob-hint" data-testid="dob-hint">
                    {STRINGS.dobHint}
                  </HintText>
                  {errors.includes("dobRequired") && (
                    <ErrorMessage>{errorMessages.dobRequired}</ErrorMessage>
                  )}
                  <div className="nhsuk-date-input" id="dob" data-testid="dob-input-group">
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label className="nhsuk-label nhsuk-date-input__label" htmlFor="dob-day"
                          data-testid="dob-day-label">
                          {STRINGS.dobDay}
                        </Label>
                        <TextInput
                          id="dob-day"
                          name="dob-day"
                          value={dobDay}
                          onChange={e => setDobDay((e.target as HTMLInputElement).value)}
                          className="nhsuk-date-input__input nhsuk-input--width-2"
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-day-input"
                        />
                      </FormGroup>
                    </div>
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label className="nhsuk-label nhsuk-date-input__label" htmlFor="dob-month"
                          data-testid="dob-month-label">
                          {STRINGS.dobMonth}
                        </Label>
                        <TextInput
                          id="dob-month"
                          name="dob-month"
                          value={dobMonth}
                          onChange={e => setDobMonth((e.target as HTMLInputElement).value)}
                          className="nhsuk-date-input__input nhsuk-input--width-2"
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-month-input"
                        />
                      </FormGroup>
                    </div>
                    <div className="nhsuk-date-input__item">
                      <FormGroup>
                        <Label className="nhsuk-label nhsuk-date-input__label" htmlFor="dob-year"
                          data-testid="dob-year-label">
                          {STRINGS.dobYear}
                        </Label>
                        <TextInput
                          id="dob-year"
                          name="dob-year"
                          value={dobYear}
                          onChange={e => setDobYear((e.target as HTMLInputElement).value)}
                          className="nhsuk-date-input__input nhsuk-input--width-4"
                          type="number"
                          pattern="[0-9]*"
                          data-testid="dob-year-input"
                        />
                      </FormGroup>
                    </div>
                  </div>
                </Fieldset>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="postcode-only" data-testid="postcode-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">{STRINGS.postcodeLabel}</h3>
                </Label>
                <HintText id="postcode-hint" data-testid="postcode-hint">{STRINGS.postcodeHint}</HintText>
                <TextInput
                  id="postcode-only"
                  name="postcode-only"
                  value={postcode}
                  onChange={e => setPostcode((e.target as HTMLInputElement).value)}
                  className="nhsuk-input--width-10"
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
