import React, {useState, useEffect, useRef} from "react"
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
import {validateBasicDetails, getInlineErrors} from "@/helpers/validateBasicDetails"
import {errorFocusMap, ErrorKey, resolveDobInvalidFields} from "@/helpers/basicDetailsValidationMeta"
import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"

export default function BasicDetailsSearch() {
  const navigate = useNavigate()
  const errorRef = useRef<HTMLDivElement | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")
  const [postcode, setPostcode] = useState("")
  const [errors, setErrors] = useState<Array<ErrorKey>>([])
  const [dobErrorFields, setDobErrorFields] = useState<Array<"day" | "month" | "year">>([])

  const inlineErrors = getInlineErrors(errors)
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()

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

  // restore original search parameters when available
  useEffect(() => {
    const relevantParams = navigationContext.getRelevantSearchParameters("basicDetails")
    if (relevantParams) {
      setFirstName(relevantParams.firstName || "")
      setLastName(relevantParams.lastName || "")
      setDobDay(relevantParams.dobDay || "")
      setDobMonth(relevantParams.dobMonth || "")
      setDobYear(relevantParams.dobYear || "")
      setPostcode(relevantParams.postcode || "")
    }
  }, [navigationContext])

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

  useEffect(() => {
    setFirstName(searchContext.firstName ?? "")
    setLastName(searchContext.lastName ?? "")
    setDobDay(searchContext.dobDay ?? "")
    setDobMonth(searchContext.dobMonth ?? "")
    setDobYear(searchContext.dobYear ?? "")
    setPostcode(searchContext.postcode ?? "")
  }, [])

  // Returns true if the given DOB field had an error on the last submission.
  // Error styling persists until the user submits the form again.
  const hasDobFieldError = (field: "day" | "month" | "year"): boolean => {
    return dobErrorFields.includes(field)
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

    // If validation fails, store errors and highlight relevant DOB fields.
    // DOB field highlights are preserved until the next form submission.
    if (newErrors.length > 0) {
      setErrors(newErrors)

      const dobErrorKeys = new Set([
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
      ])

      const hasDobRelatedError = newErrors.some((error) =>
        dobErrorKeys.has(error)
      )

      if (hasDobRelatedError) {
        setDobErrorFields(
          resolveDobInvalidFields({dobDay, dobMonth, dobYear})
        )
      } else {
        setDobErrorFields([])
      }

      return
    }

    //clear any previous search navigation context
    navigationContext.startNewNavigationSession()

    // capture original search parameters before clearing
    const originalParams = {
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode
    }
    navigationContext.captureOriginalSearchParameters(
      "basicDetails",
      originalParams
    )
    //API requires a 2 digit format i.e. 06 instead of 6 for June
    const formattedDobDay = dobDay.padStart(2, "0")
    const formattedDobMonth = dobMonth.padStart(2, "0")

    searchContext.clearSearchParameters()
    searchContext.setFirstName(firstName)
    searchContext.setLastName(lastName)
    searchContext.setDobDay(formattedDobDay)
    searchContext.setDobMonth(formattedDobMonth)
    searchContext.setDobYear(dobYear)
    searchContext.setPostcode(postcode)
    searchContext.setSearchType("basicDetails")
    navigate(FRONTEND_PATHS.PATIENT_SEARCH_RESULTS)
  }

  return (
    <Container className="nhsuk-width-container-fluid" data-testid="basic-details-search-form-container">
      <Row className="patient-search-form">
        <Col width="three-quarters">
          <Form onSubmit={handleSubmit} noValidate autoComplete="off" data-testid="basic-details-form">
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

                  <DateInput
                    id="dob"
                    aria-labelledby="dob-label"
                    aria-describedby="dob-hint"
                    data-testid="dob-input-group"
                  >
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
