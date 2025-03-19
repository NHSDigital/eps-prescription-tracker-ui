import React, {useContext, useState, useEffect} from "react"
import {
    Container,
    Row,
    Col,
    Label,
    HintText,
    TextInput,
    Button,
    Form,
} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

// API endpoint for prescription details
const prescriptionDetailsEndpoint = "/api/prescription-details"

export default function PrescriptionIdSearch() {
    const auth = useContext(AuthContext)

    // State variables
    const [prescriptionId, setPrescriptionId] = useState<string>("")
    const [searchResult, setSearchResult] = useState(null)
    const [error, setError] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrescriptionId(e.target.value)
    }

    // Handle form submission
    const handlePrescriptionDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearchResult(null)
        setError("")
        setLoading(true)

        if (!prescriptionId) {
            setError("Please enter a valid prescription ID.")
            setLoading(false)
            return
        }

        const url = `${prescriptionDetailsEndpoint}/${prescriptionId}`

        try {
            // Perform API request to fetch prescription details
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${auth?.idToken}`, // Include authentication token
                    "NHSD-Session-URID": "555254242106", // Required session header
                },
            })

            if (!response.ok) {
                throw new Error(
                    `Failed to retrieve prescription details, Status Code: ${response.status}`,
                )
            }

            const data = await response.json()
            setSearchResult({...data, json: JSON.stringify(data, null, 2)})
            setError("")

            console.log("data:", {data})
        } catch (error) {
            console.error("Error retrieving prescription details:", error)
            setSearchResult(null)
            setError("Error retrieving prescription details. Please try again.")
        } finally {
            setLoading(false) // Ensure loading state is cleared
        }
    }

    return (
        <Container className="nhsuk-width-container-fluid patient-search-form-container">
            <Row>
                <Col width="one-half">
                    <Form onSubmit={handlePrescriptionDetails}>
                        <div className="patient-search-form__field-group">
                            <Label id="presc-id-label">
                                <h2 className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline">
                                    {PRESCRIPTION_ID_SEARCH_STRINGS.labelText}
                                </h2>
                            </Label>
                            <HintText id="presc-id-hint">
                                {PRESCRIPTION_ID_SEARCH_STRINGS.hintText}
                            </HintText>
                            {/* Input field for prescription ID */}
                            <TextInput
                                id="presc-id-input"
                                name="prescriptionId"
                                value={prescriptionId}
                                maxLength={20}
                                width="20"
                                onChange={handleInputChange}
                                autoComplete="off"
                            />
                        </div>
                        {error && <p className="nhsuk-error-message">{error}</p>}
                        <Button type="submit">
                            {loading
                                ? "Searching..."
                                : PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
                        </Button>
                    </Form>
                </Col>
            </Row>

            {/* Loading message */}
            {loading && <p>Loading...</p>}
        </Container>
    )
}
