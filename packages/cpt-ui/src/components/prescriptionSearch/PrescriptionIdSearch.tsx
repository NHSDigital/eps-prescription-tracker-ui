import React, {useContext, useState} from "react"
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

// API endpoint for prescription details
const prescriptionDetailsEndpoint = "/api/prescription-details"

const normalizePrescriptionId = (raw: string): string => {
    const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "") // remove non-allowed chars
    return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() || ""
}

export default function PrescriptionIdSearch() {
    const auth = useContext(AuthContext)

    const [prescriptionId, setPrescriptionId] = useState<string>("")
    const [searchResult, setSearchResult] = useState(null)
    const [errorType, setErrorType] = useState<"" | "empty" | "length" | "chars" | "noMatch">("")
    const [loading, setLoading] = useState<boolean>(false)

    const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.errors

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrescriptionId(e.target.value)
        setErrorType("")
    }

    const handlePrescriptionDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearchResult(null)
        setErrorType("")
        setLoading(true)

        if (!prescriptionId.trim()) {
            setErrorType("empty")
            setLoading(false)
            return
        }

        const raw = prescriptionId.trim()

        // First validate characters directly from raw input
        const invalidCharPattern = /[^A-Za-z0-9+-]/g
        if (invalidCharPattern.test(raw)) {
            setErrorType("chars")
            setLoading(false)
            return
        }

        const cleaned = raw.replace(/[^A-Za-z0-9+]/g, "")

        // Validation: Must be exactly 18 chars (excluding dashes)
        if (cleaned.length !== 18) {
            setErrorType("length")
            setLoading(false)
            return
        }

        // Validation: Only allow A-F and 0-9 for first 17 chars, final can include +
        const validChars = /^[A-F0-9]{17}[A-Z0-9+]$/i
        if (!validChars.test(cleaned)) {
            setErrorType("chars")
            setLoading(false)
            return
        }

        const formatted = normalizePrescriptionId(cleaned)

        const url = `${prescriptionDetailsEndpoint}/${formatted}`

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${auth?.idToken}`,
                    "NHSD-Session-URID": "555254242106"
                }
            })

            if (!response.ok) {
                throw new Error(`Status Code: ${response.status}`)
            }

            const data = await response.json()
            setSearchResult({...data, json: JSON.stringify(data, null, 2)})
        } catch (error) {
            console.error("Error retrieving prescription details:", error)
            setSearchResult(null)
            setErrorType("noMatch")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container
            className="nhsuk-width-container-fluid patient-search-form-container"
            data-testid="prescription-id-search-container"
        >
            <Row>
                <Col width="one-half">
                    <Form onSubmit={handlePrescriptionDetails} noValidate>
                        {/* Error Summary */}
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
                                    data-testid="prescription-id-label"
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

                        <Button type="submit" data-testid="prescription-id-submit">
                            {loading ? "Loading search results" : PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
                        </Button>
                    </Form>
                </Col>
            </Row>

            {loading && <p>Loading search results...</p>}
        </Container>
    )
}
