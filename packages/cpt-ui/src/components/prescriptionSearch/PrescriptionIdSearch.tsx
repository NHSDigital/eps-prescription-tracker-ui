import React, {useState, useEffect, useRef} from "react"
import {useNavigate} from "react-router-dom"

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
import {validatePrescriptionId} from "@/helpers/validatePrescriptionDetailsSearch"

const normalizePrescriptionId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "")
  return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() || ""
}

export default function PrescriptionIdSearch() {
  const navigate = useNavigate()
  const errorRef = useRef<HTMLDivElement | null>(null)

  const [prescriptionId, setPrescriptionId] = useState<string>("")
  const [errors, setErrors] = useState<Array<string>>([])

  const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.errors

  useEffect(() => {
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errors])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrescriptionId(e.target.value)
  }

  const handlePrescriptionDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validatePrescriptionId(prescriptionId)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    const cleaned = prescriptionId.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()
    const formatted = normalizePrescriptionId(cleaned)

    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?prescriptionId=${formatted}`)
  }

  const getDisplayedErrorMessage = () => {
    if (errors.includes("combined")) return errorMessages.combined
    if (errors.includes("empty")) return errorMessages.empty
    if (errors.includes("noMatch") || errors.includes("checksum")) return errorMessages.noMatch
    if (errors.includes("length")) return errorMessages.length
    if (errors.includes("chars")) return errorMessages.chars
    return errorMessages.noMatch // fallback
  }

  return (
    <Container
      className="nhsuk-width-container-fluid"
      data-testid="prescription-id-search-container"
    >
      <Row>
        <Col width="one-half">
          <Form onSubmit={handlePrescriptionDetails} noValidate>
            {errors.length > 0 && (
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
                      <a href="#presc-id-input">{getDisplayedErrorMessage()}</a>
                    </ErrorSummary.Item>
                  </ErrorSummary.List>
                </ErrorSummary.Body>
              </ErrorSummary>
            )}

            <FormGroup className={errors.length > 0 ? "nhsuk-form-group--error" : ""}>
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

              {errors.length > 0 && (
                <ErrorMessage>{getDisplayedErrorMessage()}</ErrorMessage>
              )}

              <TextInput
                id="presc-id-input"
                name="prescriptionId"
                value={prescriptionId}
                onChange={handleInputChange}
                className={errors.length > 0 ? "nhsuk-input nhsuk-input--error" : "nhsuk-input"}
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
