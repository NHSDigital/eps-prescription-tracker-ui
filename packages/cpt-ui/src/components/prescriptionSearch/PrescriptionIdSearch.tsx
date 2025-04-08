import React, {useState, useEffect, useRef} from "react"
import {useNavigate, useSearchParams} from "react-router-dom"

import {
  Container,
  Row,
  Col,
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

const normalizePrescriptionId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "") // remove non-allowed chars
  return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() || ""
}

export default function PrescriptionIdSearch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const errorRef = useRef<HTMLDivElement | null>(null)

  const [prescriptionId, setPrescriptionId] = useState<string>("")
  const [errorType, setErrorType] = useState<"" | "empty" | "length" | "chars" | "noMatch">("")

  const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.errors

  // Focus input on page load
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>("#presc-id-input")
    input?.focus()

    setPrescriptionId(searchParams.get("prescriptionId") || "")
  }, [])

  // Focus error box when error appears
  // According to the docs, the ErrorSummary component SHOULD do this itself, but that doesn't seem to be the case
  // so we'll do it ourselves
  // https://github.com/nhsuk/nhsuk-frontend/tree/main/packages/components/error-summary
  useEffect(() => {
    if (errorType && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errorType])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrescriptionId(e.target.value)
    setErrorType("")
  }

  const handlePrescriptionDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorType("")

    const raw = prescriptionId.trim()
    if (!raw) {
      setErrorType("empty")
      return
    }

    // Show "chars" error if input has invalid characters
    const rawCharPattern = /^[a-zA-Z0-9+ -]*$/
    if (!rawCharPattern.test(raw)) {
      setErrorType("chars")
      return
    }

    // Normalize and clean input
    const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()

    // Must be exactly 18 chars (excluding dashes)
    if (cleaned.length !== 18) {
      setErrorType("length")
      return
    }

    const formatted = normalizePrescriptionId(cleaned)

    // Validate full formatted pattern
    const shortFormPattern = /^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/
    if (!shortFormPattern.test(formatted)) {
      setErrorType("noMatch")
      return
    }

    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?prescriptionId=${formatted}`)
  }

  return (
    <Container
      className="nhsuk-width-container-fluid"
      data-testid="prescription-id-search-container"
    >
      <Row>
        <Col width="one-half">
          <Form onSubmit={handlePrescriptionDetails} noValidate>
            {errorType && (
              <ErrorSummary
                data-testid="error-summary"
                ref={errorRef}
              >
                <ErrorSummary.Title>
                  {PRESCRIPTION_ID_SEARCH_STRINGS.errorSummaryHeading}
                </ErrorSummary.Title>
                <ErrorSummary.Body>
                  <ErrorSummary.List>
                    <ErrorSummary.Item>
                      <a href="#presc-id-input">{errorMessages[errorType]}</a>
                    </ErrorSummary.Item>
                  </ErrorSummary.List>
                </ErrorSummary.Body>
              </ErrorSummary>
            )}

            <FormGroup
              className={`${errorType ? "nhsuk-form-group--error" : ""}`}
            >
              <Label htmlFor="presc-id-input" id="presc-id-label">
                <h2
                  className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline"
                  data-testid="prescription-id-search-heading"
                >
                  {PRESCRIPTION_ID_SEARCH_STRINGS.labelText}
                </h2>
              </Label>
              <HintText id="presc-id-hint" data-testid="prescription-id-hint">
                {PRESCRIPTION_ID_SEARCH_STRINGS.hintText}
              </HintText>

              {errorType && (
                <ErrorMessage>
                  {errorMessages[errorType]}
                </ErrorMessage>
              )}

              <TextInput
                id="presc-id-input"
                name="prescriptionId"
                value={prescriptionId}
                onChange={handleInputChange}
                className={errorType ? "nhsuk-input nhsuk-input--error" : "nhsuk-input"}
                autoComplete="off"
                data-testid="prescription-id-input"
              />
            </FormGroup>

            <Button type="submit" data-testid="find-prescription-button">
              {PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}
