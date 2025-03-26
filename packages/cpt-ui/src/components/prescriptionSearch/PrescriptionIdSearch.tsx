import React, {useContext, useState, useEffect, useRef} from "react"
import {
    Container,
    Row,
    Col,
    Label,
    HintText,
    TextInput,
    Button,
    Form
} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

import {useNavigate} from "react-router-dom"

// API endpoint for prescription details
const prescriptionDetailsEndpoint = "/api/prescription-details"

const normalizePrescriptionId = (raw: string): string => {
    const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "") // remove non-allowed chars
    return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() || ""
}

export default function PrescriptionIdSearch() {
    const auth = useContext(AuthContext)
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement | null>(null)

    const [prescriptionId, setPrescriptionId] = useState<string>("")
    const [errorType, setErrorType] = useState<"" | "empty" | "length" | "chars" | "noMatch">("")
    const [loading, setLoading] = useState<boolean>(false)

    const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.errors

    useEffect(() => {
        const input = document.querySelector<HTMLInputElement>("#presc-id-input")
        input?.focus()
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrescriptionId(e.target.value)
        setErrorType("")
    }

    const handlePrescriptionDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorType("")
        setLoading(true)

        const raw = prescriptionId.trim()
        if (!raw) {
            setErrorType("empty")
            setLoading(false)
            return
        }

        // Show "chars" error if input has invalid characters
        const rawCharPattern = /^[a-zA-Z0-9+ -]*$/
        if (!rawCharPattern.test(raw)) {
            setErrorType("chars")
            setLoading(false)
            return
        }

        // Normalize and clean input
        const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()

        // Must be exactly 18 chars (excluding dashes)
        if (cleaned.length !== 18) {
            setErrorType("length")
            setLoading(false)
            return
        }

        const formatted = normalizePrescriptionId(cleaned)

        // Validate full formatted pattern
        const shortFormPattern = /^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/
        if (!shortFormPattern.test(formatted)) {
            setErrorType("noMatch")
            setLoading(false)
            return
        }

        // This block will be used in the future when backend data is available.
        // For now, it is commented out and replaced with a mock implementation below
        // to allow front-end testing without a live API.

        // const url = `${prescriptionDetailsEndpoint}/${formatted}`

        // try {
        //     const response = await fetch(url, {
        //         method: "GET",
        //         headers: {
        //             Authorization: `Bearer ${auth?.idToken}`,
        //             "NHSD-Session-URID": "555254242106"
        //         }
        //     })

        //     if (!response.ok) throw new Error(`Status Code: ${response.status}`)

        //     // Redirect to prescription results page
        //     navigate(`/prescription-results?prescriptionId=${formatted}`)
        // } catch (error) {
        //     console.error("Error retrieving prescription details:", error)
        //     navigate("/prescription-not-found")
        // } finally {
        //     setLoading(false)
        // }

        // MOCK: Hardcoded response for known test ID
        await new Promise((res) => setTimeout(res, 500)) // simulate loading

        // Check against known match
        if (formatted === "C0C757-A83008-C2D93O") {
            navigate(`/prescription-results?prescriptionId=${formatted}`)
        } else {
            setErrorType("noMatch")
        }

        setLoading(false)
    }

    return (
        <Container
            className="nhsuk-width-container-fluid patient-search-form-container"
            data-testid="prescription-id-search-container"
        >
            <Row>
                <Col width="one-half">
                    <Form onSubmit={handlePrescriptionDetails} noValidate>
                        {errorType && (
                            <div
                                className="nhsuk-error-summary"
                                aria-labelledby="error-summary-title"
                                role="alert"
                                tabIndex={-1}
                                data-testid="error-summary"
                            >
                                <h2 className="nhsuk-error-summary__title" id="error-summary-title">
                                    {PRESCRIPTION_ID_SEARCH_STRINGS.errorSummaryTitle}
                                </h2>
                                <div className="nhsuk-error-summary__body">
                                    <ul className="nhsuk-list nhsuk-error-summary__list">
                                        <li>
                                            <a href="#presc-id-input">{errorMessages[errorType]}</a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div
                            className={`patient-search-form__field-group ${errorType ? "nhsuk-form-group--error" : ""
                                }`}
                        >
                            <Label id="presc-id-label">
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
                                <span id="nhs-no-error-error" className="nhsuk-error-message">
                                    {errorMessages[errorType]}
                                </span>
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
                        </div>

                        <Button type="submit" data-testid="find-prescription-button">
                            {loading ? "Loading search results" : PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
                        </Button>
                    </Form>
                </Col>
            </Row>

            {loading && <p>Loading search results...</p>}
        </Container>
    )
}
