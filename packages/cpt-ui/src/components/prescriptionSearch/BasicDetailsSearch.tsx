import React from "react"
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
  Fieldset
} from "nhsuk-react-components"

import {STRINGS} from "@/constants/ui-strings/BasicDetailsSearchStrings"

export default function BasicDetailsSearch() {
  return (
    <Container className="nhsuk-width-container-fluid" data-testid="basic-details-search-form-container">
      <Row className="patient-search-form">
        <Col width="three-quarters">
          <Form
            onSubmit={(e) => e.preventDefault()}
            noValidate
            data-testid="basic-details-form"
          >
            <div className="patient-search-form__field-group" data-testid="field-group">
              <h2
                className="nhsuk-heading-m nhsuk-u-margin-bottom-3 no-outline"
                id="basic-details-search-heading"
                tabIndex={-1}
                data-testid="basic-details-search-heading"
              >
                <span className="nhsuk-u-visually-hidden">{STRINGS.visuallyHiddenPrefix} </span>
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
                  className="nhsuk-input--width-20"
                  data-testid="first-name-input"
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="last-name" data-testid="last-name-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.lastNameLabel}
                  </h3>
                </Label>
                <TextInput
                  id="last-name"
                  name="last-name"
                  className="nhsuk-input--width-20"
                  data-testid="last-name-input"
                />
              </FormGroup>

              <FormGroup>
                <Fieldset role="group" aria-labelledby="dob-label">
                  <Fieldset.Legend
                    className="nhsuk-fieldset__legend nhsuk-fieldset__legend--s"
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
                          type="number"
                          pattern="[0-9]*"
                          className="nhsuk-date-input__input nhsuk-input--width-2"
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
                          type="number"
                          pattern="[0-9]*"
                          className="nhsuk-date-input__input nhsuk-input--width-2"
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
                          type="number"
                          pattern="[0-9]*"
                          className="nhsuk-date-input__input nhsuk-input--width-4"
                          data-testid="dob-year-input"
                        />
                      </FormGroup>
                    </div>
                  </div>
                </Fieldset>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="postcode-only" data-testid="postcode-label">
                  <h3 className="nhsuk-heading-s nhsuk-u-margin-bottom-1 no-outline">
                    {STRINGS.postcodeLabel}
                  </h3>
                </Label>
                <HintText id="postcode-hint" data-testid="postcode-hint">
                  {STRINGS.postcodeHint}
                </HintText>
                <TextInput
                  id="postcode-only"
                  name="postcode-only"
                  className="nhsuk-input--width-10"
                  data-testid="postcode-input"
                />
              </FormGroup>
            </div>

            <Button
              className="patient-search-form__button"
              id="basic-details-submit"
              type="submit"
              data-testid="find-patient-button"
            >
              {STRINGS.buttonText}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  )
}
