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
import {FRONTEND_PATHS} from "@/constants/environment"

export default function NhsNumSearch() {
  const [nhsNumber, setNhsNumber] = useState("")
  const [errorType, setErrorType] = useState<"" | "empty" | "length" | "chars">("")
  const errorRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  const errorMessages = STRINGS.errors

  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>("#nhs-number-input")
    input?.focus()
  }, [])

  useEffect(() => {
    if (errorType && errorRef.current) {
      errorRef.current.focus()
    }
  }, [errorType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNhsNumber(e.target.value)
    setErrorType("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = nhsNumber.replace(/\s/g, "")

    if (!cleaned) {
      setErrorType("empty")
      return
    }

    if (!/^\d+$/.test(cleaned)) {
      setErrorType("chars")
      return
    }

    if (cleaned.length !== 10) {
      setErrorType("length")
      return
    }

    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}?nhsNumber=${cleaned}`)
  }

  return (
    <Container className="nhsuk-width-container-fluid patient-search-form-container">
      <Row>
        <Col width="one-half">
          <Form onSubmit={handleSubmit} noValidate>
            {errorType && (
              <ErrorSummary ref={errorRef}>
                <ErrorSummary.Title>
                  {STRINGS.errorSummaryHeading}
                </ErrorSummary.Title>
                <ErrorSummary.Body>
                  <ErrorSummary.List>
                    <ErrorSummary.Item>
                      <a href="#nhs-number-input">{errorMessages[errorType]}</a>
                    </ErrorSummary.Item>
                  </ErrorSummary.List>
                </ErrorSummary.Body>
              </ErrorSummary>
            )}

            <FormGroup className={errorType ? "nhsuk-form-group--error" : ""}>
              <Label htmlFor="nhs-number-input" id="nhs-number-label">
                <h2 className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline">
                  <span className="nhsuk-u-visually-hidden">{STRINGS.hiddenText}</span>
                  {STRINGS.labelText}
                </h2>
              </Label>
              <HintText id="nhs-number-hint">
                {STRINGS.hintText}
              </HintText>

              {errorType && <ErrorMessage>{errorMessages[errorType]}</ErrorMessage>}

              <TextInput
                id="nhs-number-input"
                name="nhsNumber"
                value={nhsNumber}
                onChange={handleChange}
                autoComplete="off"
                type="tel"
                className={`nhsuk-input nhsuk-input--width-10 
                  ${errorType ? "nhsuk-input--error" : ""}`}
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
