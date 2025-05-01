import React, {useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router-dom"
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
  ErrorMessage
} from "nhsuk-react-components"

import {STRINGS} from "@/constants/ui-strings/NhsNumSearchStrings"
import {SEARCH_TYPES} from "@/constants/ui-strings/PrescriptionNotFoundPageStrings"
import {FRONTEND_PATHS} from "@/constants/environment"

type ErrorKey = keyof typeof STRINGS.errors

export default function NhsNumSearch() {
  const [nhsNumber, setNhsNumber] = useState("")
  const [errorTypes, setErrorTypes] = useState<Array<ErrorKey>>([])
  const errorRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const errorMessages = STRINGS.errors

  useEffect(() => {
    document.querySelector<HTMLInputElement>("#nhs-number-input")?.focus()
  }, [])

  useEffect(() => {
    if (errorTypes.length > 0 && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errorTypes])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNhsNumber(e.target.value)
    setErrorTypes([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = nhsNumber.replace(/\s/g, "")
    const errors: Array<ErrorKey> = []

    if (!cleaned) {
      errors.push("empty")
    } else {
      if (cleaned.length !== 10) errors.push("length")
      if (!/^\d+$/.test(cleaned)) errors.push("chars")
    }

    if (errors.length > 0) {
      setErrorTypes(errors)
      return
    }

    // FIXME: This is temporary logic for front-end demo/testing only.
    // Replace with real backend call once NHS number search is implemented server-side.
    if (cleaned === "1234567890") {
      navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${cleaned}`)
    } else {
      navigate(`${FRONTEND_PATHS.PRESCRIPTION_NOT_FOUND}?searchType=${SEARCH_TYPES.NHS_NUMBER}`)
    }
  }

  const showCombinedFieldError =
    errorTypes.includes("length") && errorTypes.includes("chars")

  return (
    <Container className="nhsuk-width-container-fluid" data-testid="patient-search-form-container">
      <Row>
        <Col width="one-half">
          <Form onSubmit={handleSubmit} noValidate data-testid="nhs-number-form">
            {errorTypes.length > 0 && (
              <ErrorSummary ref={errorRef} data-testid="error-summary">
                <ErrorSummary.Title>{STRINGS.errorSummaryHeading}</ErrorSummary.Title>
                <ErrorSummary.Body>
                  <ErrorSummary.List>
                    {errorTypes.map((err) => (
                      <ErrorSummary.Item key={err} data-testid={`error-summary-item-${err}`}>
                        <a href="#nhs-number-input">{errorMessages[err]}</a>
                      </ErrorSummary.Item>
                    ))}
                  </ErrorSummary.List>
                </ErrorSummary.Body>
              </ErrorSummary>
            )}

            <FormGroup className={errorTypes.length > 0 ? "nhsuk-form-group--error" : ""}>
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

              {errorTypes.length > 0 && (
                <ErrorMessage data-testid="error-message">
                  {showCombinedFieldError
                    ? errorMessages["chars"]
                    : errorMessages[errorTypes[0]]}
                </ErrorMessage>
              )}

              <TextInput
                id="nhs-number-input"
                name="nhsNumber"
                value={nhsNumber}
                onChange={handleChange}
                autoComplete="off"
                className={`nhsuk-input--width-10 ${errorTypes.length > 0 ? "nhsuk-input--error" : ""}`}
                aria-describedby="nhs-number-hint"
                aria-labelledby="nhs-number-label"
                data-testid="nhs-number-input"
              />
            </FormGroup>

            <Button type="submit" id="nhs-number-submit" data-testid="find-patient-button">
              {STRINGS.buttonText}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}
