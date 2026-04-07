import React, {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import {useNavigate} from "react-router-dom"
import {
  Form,
  FormGroup,
  Label,
  HintText,
  TextInput,
  Button,
  ErrorSummary,
  ErrorMessage
} from "nhsuk-react-components"

import {STRINGS} from "@/constants/ui-strings/NhsNumSearchStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"
import {validateNhsNumber, normalizeNhsNumber, NhsNumberValidationError} from "@/helpers/validateNhsNumber"
import {usePageTitle} from "@/hooks/usePageTitle"

export default function NhsNumSearch() {
  const navigate = useNavigate()
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()
  const [nhsNumber, setNhsNumber] = useState<string>(
    searchContext.nhsNumber || ""
  )
  const [errorKey, setErrorKey] = useState<NhsNumberValidationError | null>(
    null
  )
  const errorRef = useRef<HTMLDivElement | null>(null)

  const errorMessages = STRINGS.errors

  const displayedError = useMemo(() => errorKey ? errorMessages[errorKey] : "", [errorKey])

  // usePageTitle(STRINGS.pageTitle)

  usePageTitle(errorKey
    ? STRINGS.pageTitle_ERROR
    : STRINGS.pageTitle)

  useEffect(() => {
    if (searchContext.nhsNumber && searchContext.searchType === "nhs") {
      setNhsNumber(searchContext.nhsNumber)
    }
  }, [searchContext.nhsNumber, searchContext.searchType])

  useEffect(() => {
    const relevantParams = navigationContext.getRelevantSearchParameters("nhsNumber")
    if (relevantParams && relevantParams.nhsNumber) {
      setNhsNumber(relevantParams.nhsNumber || "")
    }
  }, [navigationContext])

  useEffect(() => {
    if (errorKey && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errorKey])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNhsNumber(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateNhsNumber(nhsNumber)

    if (validationError) {
      setErrorKey(validationError)
      return
    }
    setErrorKey(null)
    const normalized = normalizeNhsNumber(nhsNumber)

    // clear any previous search context
    navigationContext.startNewNavigationSession()

    const originalParams = {
      nhsNumber: normalized || ""
    }
    navigationContext.captureOriginalSearchParameters(
      "nhsNumber",
      originalParams
    )

    searchContext.clearSearchParameters()
    searchContext.setNhsNumber(normalized || "")
    searchContext.setSearchType("nhs")

    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`)
  }

  return (
    <Fragment>
      {errorKey && (
        <ErrorSummary ref={errorRef} data-testid="error-summary" className="prescription-id-aligned-element">
          <ErrorSummary.Title>{STRINGS.errorSummaryHeading}</ErrorSummary.Title>
          <ErrorSummary.Body>
            <ErrorSummary.List>
              <ErrorSummary.Item>
                <a href="#nhs-number-input">{displayedError}</a>
              </ErrorSummary.Item>
            </ErrorSummary.List>
          </ErrorSummary.Body>
        </ErrorSummary>
      )}
      <div className="prescription-id-aligned-element">
        <Form onSubmit={handleSubmit} noValidate data-testid="nhs-number-form">
          <FormGroup className={errorKey ? "nhsuk-form-group--error" : ""}>
            <Label htmlFor="nhs-number-input" id="nhs-number-label" data-testid="nhs-number-label">
              <h2 className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline"
                data-testid="nhs-number-search-heading">
                <span className="nhsuk-u-visually-hidden">{STRINGS.hiddenText}</span>
                {STRINGS.labelText}
              </h2>
            </Label>
            <HintText id="nhs-number-hint" data-testid="nhs-number-hint">
              {STRINGS.hintText}
            </HintText>

            {errorKey && (
              <ErrorMessage id="nhs-number-error" data-testid={`error-message-${errorKey}`}>
                {displayedError}
              </ErrorMessage>
            )}

            <TextInput
              id="nhs-number-input"
              name="nhsNumber"
              value={nhsNumber}
              onChange={handleChange}
              autoComplete="off"
              className={`nhsuk-input--width-10 ${errorKey ? "nhsuk-input--error" : ""}`}
              aria-describedby={errorKey ? "nhs-number-hint nhs-number-error" : "nhs-number-hint"}
              aria-labelledby="nhs-number-label"
              data-testid="nhs-number-input"
            />
          </FormGroup>

          <Button type="submit" id="nhs-number-submit" data-testid="find-patient-button">
            {STRINGS.buttonText}
          </Button>
        </Form>
      </div>
    </Fragment>
  )
}
