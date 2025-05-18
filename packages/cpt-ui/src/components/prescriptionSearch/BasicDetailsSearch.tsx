import React, {
  useContext,
  useState,
  useEffect,
  useRef
} from "react"
import {
  Container,
  Row,
  Col,
  DateInput,
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
import {AuthContext} from "@/context/AuthProvider"
import http from "@/helpers/axios"
import {formatDobForSearch} from "@/helpers/formatters"
import {validateBasicDetails, getInlineErrors} from "@/helpers/validateBasicDetails"
import {errorFocusMap, ErrorKey, resolveDobInvalidFields} from "@/helpers/basicDetailsValidationMeta"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"
import {API_ENDPOINTS, FRONTEND_PATHS, NHS_REQUEST_URID} from "@/constants/environment"
import {BasicDetailsSearchType} from "@cpt-ui-common/common-types"

// Temporary mock data used for frontend search simulation
const mockPatient = [
  {
    nhsNumber: "1234567890",
    given: "James",
    family: "Smith",
    dateOfBirth: "02-04-2006",
    postcode: "LS1 1AB"
  }
]

const mockMultiplePatient = [
  {
    nhsNumber: "9726919207",
    given: "Issac",
    family: "Wolderton-Rodriguez",
    dateOfBirth: "06-05-2013",
    postcode: "LS6 1JL"
  },
  {
    nhsNumber: "9726919207",
    given: "Steve",
    family: "Wolderton-Rodriguez",
    dateOfBirth: "06-05-2013",
    postcode: "LS6 1JL"
  }
]

// Utility to normalize input for case-insensitive and whitespace-tolerant comparison
const formatInput = (input: string) => input.trim().toLowerCase()

export default function BasicDetailsSearch() {
  const auth = useContext(AuthContext)
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

  // Inline error lookup: used to find the error message string for specific field(s)
  // Returns the first match found in the array of inline error tuples
  const getInlineError = (...fields: Array<string>) =>
    inlineErrors.find(([key]) => fields.includes(key))?.[1]

  useEffect(() => {
    // Auto-focus the error summary block if there are any validation errors
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errors])

  useEffect(() => {
    // Allows keyboard/screen-reader users to jump to field when clicking summary links
    // Needed for tests: jsdom doesn't auto-focus elements via href="#field-id" links.
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a[href^='#']")
      if (target) {
        const id = target.getAttribute("href")?.substring(1)
        const el = document.getElementById(id!)
        if (el && typeof el.focus === "function") {
          el.focus()
        }
      }
    }

    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  // Checks whether a specific DOB input field should be highlighted in red (error styling)
  // Combines individual errors, missing fields, and invalid full date logic
  const hasDobFieldError = (field: "day" | "month" | "year"): boolean => {
    const fieldErrorsMap = {
      day: ["dobDayRequired", "dobNonNumericDay"],
      month: ["dobMonthRequired", "dobNonNumericMonth"],
      year: ["dobYearRequired", "dobNonNumericYear", "dobYearTooShort", "dobFutureDate"]
    }

    // Field-specific validation errors
    const hasSpecificError = Boolean(getInlineError(...fieldErrorsMap[field]))

    // Global DOB-required error
    const hasDobRequiredError = errors.includes("dobRequired")

    // Use resolveDobInvalidField to decide which field should show error class
    const shouldHighlightForInvalidDate =
      errors.includes("dobInvalidDate") &&
      resolveDobInvalidFields({dobDay, dobMonth, dobYear}).includes(field)

    return hasSpecificError || hasDobRequiredError || shouldHighlightForInvalidDate
  }

  // Handles form submission logic
  // Performs validation, sends API request, handles errors, and navigates appropriately
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Run validation and collect any error keys
    const newErrors = validateBasicDetails({
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode
    })

    // If validation fails, render errors and stop
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    const formState: BasicDetailsSearchType = {
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode
    }

    try {
      // Attempt to fetch patient details from the backend API
      const response = await http.post(API_ENDPOINTS.PATIENT_SEARCH, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          "NHSD-Session-URID": NHS_REQUEST_URID
        },
        ...formState
      })

      // Validate HTTP response status
      if (response.status !== 200) {
        throw new Error(`Status Code: ${response.status}`)
      }

      // Assign response payload or throw if none received
      const payload = response.data
      if (!payload) {
        throw new Error("No payload received from the API")
      }
    } catch (err) {
      console.error("Failed to fetch patient details. Using mock data fallback.", err)

      // FIXME: This is a static, mock data fallback we can use in lieu of the real data
      // backend endpoint, which is still waiting for the auth SNAFU to get sorted out.

      // Construct a normalized DOB string to match against mock patient data,
      // since mock DOBs are stored in the format 'DD-MM-YYYY'
      const searchDob = formatDobForSearch({dobDay, dobMonth, dobYear})

      const matchedPatients = [...mockPatient, ...mockMultiplePatient].filter(p => {
        const matchFirstName = firstName ? formatInput(p.given) === formatInput(firstName) : true
        const matchLastName = formatInput(p.family) === formatInput(lastName)
        const matchDob = p.dateOfBirth === searchDob
        const matchPostcode = postcode ? formatInput(p.postcode) === formatInput(postcode) : true
        return matchFirstName && matchLastName && matchDob && matchPostcode
      })

      // Navigate based on match count
      if (matchedPatients.length === 1) {
        navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${matchedPatients[0].nhsNumber}`)
      } else if (matchedPatients.length > 1) {
        navigate(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS, {
          state: {patients: matchedPatients}
        })
      } else {
        navigate(FRONTEND_PATHS.SEARCH_RESULTS_TOO_MANY, {
          state: formState
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
                        <a href={`#${typeof errorFocusMap[key] === "function"
                          ? errorFocusMap[key]({dobDay, dobMonth, dobYear})
                          : errorFocusMap[key] ?? "basic-details-search-heading"}`}>
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
                <Label htmlFor="first-name" className="nhsuk-label-h3" data-testid="first-name-label">
                  {STRINGS.firstNameLabel}
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
                <Label htmlFor="last-name" className="nhsuk-label-h3" data-testid="last-name-label">
                  {STRINGS.lastNameLabel}
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
              <FormGroup className={getInlineError(
                "dobRequired",
                "dobDayRequired",
                "dobMonthRequired",
                "dobYearRequired",
                "dobNonNumericDay",
                "dobNonNumericMonth",
                "dobNonNumericYear",
                "dobYearTooShort",
                "dobInvalidDate",
                "dobFutureDate"
              ) ? "nhsuk-form-group--error" : ""}>
                <Fieldset >
                  <Fieldset.Legend headingLevel="h3" id="dob-label">
                    <span className="nhsuk-label-h3">{STRINGS.dobLabel}</span>
                  </Fieldset.Legend>
                  <HintText id="dob-hint" data-testid="dob-hint">{STRINGS.dobHint}</HintText>

                  {/* Inline error for DOB (shown once above all inputs) */}
                  {getInlineError(
                    "dobRequired",
                    "dobDayRequired",
                    "dobMonthRequired",
                    "dobYearRequired",
                    "dobNonNumericDay",
                    "dobNonNumericMonth",
                    "dobNonNumericYear",
                    "dobYearTooShort",
                    "dobInvalidDate",
                    "dobFutureDate"
                  ) && (
                    <ErrorMessage>
                      {getInlineError(
                        "dobRequired",
                        "dobDayRequired",
                        "dobMonthRequired",
                        "dobYearRequired",
                        "dobNonNumericDay",
                        "dobNonNumericMonth",
                        "dobNonNumericYear",
                        "dobYearTooShort",
                        "dobInvalidDate",
                        "dobFutureDate"
                      )}
                    </ErrorMessage>
                  )}

                  <DateInput id="dob" data-testid="dob-input-group">
                    {/* Day */}
                    <DateInput.Day
                      id="dob-day"
                      name="dob-day"
                      value={dobDay}
                      onChange={e => setDobDay((e.target as HTMLInputElement).value)}
                      error={hasDobFieldError("day")}
                      labelProps={{
                        children: STRINGS.dobDay,
                        bold: false
                      }}
                      data-testid="dob-day-input"
                    />

                    {/* Month */}
                    <DateInput.Month
                      id="dob-month"
                      name="dob-month"
                      value={dobMonth}
                      onChange={e => setDobMonth((e.target as HTMLInputElement).value)}
                      error={hasDobFieldError("month")}
                      labelProps={{
                        children: STRINGS.dobMonth,
                        bold: false
                      }}
                      data-testid="dob-month-input"
                    />

                    {/* Year */}
                    <DateInput.Year
                      id="dob-year"
                      name="dob-year"
                      value={dobYear}
                      onChange={e => setDobYear((e.target as HTMLInputElement).value)}
                      error={hasDobFieldError("year")}
                      labelProps={{
                        children: STRINGS.dobYear,
                        bold: false
                      }}
                      data-testid="dob-year-input"
                    />
                  </DateInput>
                </Fieldset>
              </FormGroup>

              {/* Postcode */}
              <FormGroup className={getInlineError("postcode") ? "nhsuk-form-group--error" : ""}>
                <Label htmlFor="postcode-only" className="nhsuk-label-h3">
                  {STRINGS.postcodeLabel}
                </Label>
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
