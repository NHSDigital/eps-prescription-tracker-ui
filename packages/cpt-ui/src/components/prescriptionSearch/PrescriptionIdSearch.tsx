import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  Fragment
} from "react"
import {useNavigate} from "react-router-dom"

import {
  Label,
  HintText,
  TextInput,
  Form,
  ErrorSummary,
  ErrorMessage,
  FormGroup,
  Button
} from "nhsuk-react-components"

import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {
  validatePrescriptionId,
  normalizePrescriptionId,
  getHighestPriorityError,
  PrescriptionValidationError
} from "@/helpers/validatePrescriptionDetailsSearch"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"
import {usePageTitle} from "@/hooks/usePageTitle"
import {sendMetrics} from "@/components/Telemetry"

export default function PrescriptionIdSearch() {
  const navigate = useNavigate()
  const errorRef = useRef<HTMLDivElement | null>(null)
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()

  const [prescriptionId, setPrescriptionId] = useState<string>(searchContext.prescriptionId || "")
  const [errorKey, setErrorKey] = useState<PrescriptionValidationError | null>(null)

  const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.errors

  useEffect(() => {
    const relevantParams = navigationContext.getRelevantSearchParameters("prescriptionId")
    if (relevantParams && relevantParams.prescriptionId) {
      setPrescriptionId(relevantParams.prescriptionId || "")
    }
  }, [navigationContext])

  usePageTitle(errorKey
    ? PRESCRIPTION_ID_SEARCH_STRINGS.pageTitle_ERROR
    : PRESCRIPTION_ID_SEARCH_STRINGS.pageTitle)

  // Maps a validation error key to the corresponding user-facing message.
  // Treats "checksum" as "noMatch" to simplify the error display logic.
  const getDisplayedErrorMessage = (
    key: PrescriptionValidationError | null
  ): string => {
    if (!key) return ""
    if (key === "noMatch") return errorMessages.noMatch
    return errorMessages[key] || errorMessages.noMatch
  }

  // Memoised error message for display
  const displayedError = useMemo(() => getDisplayedErrorMessage(errorKey), [errorKey])

  useEffect(() => {
    if (
      searchContext.prescriptionId &&
      searchContext.searchType === "prescriptionId"
    ) {
      setPrescriptionId(searchContext.prescriptionId)
    }
  }, [searchContext.prescriptionId, searchContext.searchType])

  // When error is set, focus error summary
  useEffect(() => {
    if (errorKey && errorRef.current) errorRef.current.focus()
  }, [errorKey])

  // Handle input field change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrescriptionId(e.target.value)
  }

  // Form submit handler
  const handlePrescriptionDetails = (e: React.FormEvent) => {
    sendMetrics({
      "metric_name": "prescription_id_search",
      "dimension": {"type": "SUMTOTAL", "value": 1}
    })
    e.preventDefault()
    const validationErrors = validatePrescriptionId(prescriptionId)
    const key = getHighestPriorityError(validationErrors)

    if (key) {
      setErrorKey(key)
      return
    }
    setErrorKey(null) // Clear error on valid submit

    const formatted = normalizePrescriptionId(prescriptionId)

    //clear previous search context
    navigationContext.startNewNavigationSession()

    const originalParams = {
      prescriptionId: formatted
    }
    navigationContext.captureOriginalSearchParameters(
      "prescriptionId",
      originalParams
    )

    searchContext.clearSearchParameters()
    searchContext.setPrescriptionId(formatted)
    searchContext.setSearchType("prescriptionId")
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`)
  }

  return (
    <Fragment>
      {errorKey && (
        <ErrorSummary
          data-testid="error-summary"
          ref={errorRef}
          className="prescription-id-aligned-element"
        >
          <ErrorSummary.Title>
            {PRESCRIPTION_ID_SEARCH_STRINGS.errorSummaryHeading}
          </ErrorSummary.Title>
          <ErrorSummary.Body>
            <ErrorSummary.List>
              <ErrorSummary.Item>
                <a href="#presc-id-input">{displayedError}</a>
              </ErrorSummary.Item>
            </ErrorSummary.List>
          </ErrorSummary.Body>
        </ErrorSummary>
      )}
      <div className="prescription-id-aligned-element">
        <Form onSubmit={handlePrescriptionDetails} noValidate>
          <FormGroup className={errorKey ? "nhsuk-form-group--error" : ""}>
            <Label htmlFor="presc-id-input" id="presc-id-label">
              <h2
                className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline"
                data-testid="prescription-id-search-heading"
              >
                {PRESCRIPTION_ID_SEARCH_STRINGS.labelText}
              </h2>
              <HintText id="presc-id-hint" data-testid="prescription-id-hint">
                {PRESCRIPTION_ID_SEARCH_STRINGS.hintText}
              </HintText>
            </Label>
            <ErrorMessage id="presc-id-error" data-testid="prescription-id-error">
              {errorKey ? displayedError : ""}
            </ErrorMessage>
            <TextInput
              id="presc-id-input"
              name="prescriptionId"
              value={prescriptionId}
              onChange={handleInputChange}
              className={errorKey ? "nhsuk-input nhsuk-input--error" : "nhsuk-input"}
              autoComplete="off"
              data-testid="prescription-id-input"
              aria-describedby={errorKey ? "presc-id-hint presc-id-error" : "presc-id-hint"}
            />
          </FormGroup>
          <Button type="submit" data-testid="find-prescription-button">
            {PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
          </Button>
        </Form>
      </div>
    </Fragment>
  )
}
