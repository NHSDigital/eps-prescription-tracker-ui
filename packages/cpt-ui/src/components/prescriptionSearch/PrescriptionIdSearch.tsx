import React, {useContext, useState, useEffect} from "react"
import {Container, Row, Col, Label, HintText, TextInput, Button, Form} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

// Define the structure of a prescription entry
interface PrescriptionEntry {
    resource: {
        resourceType: string
        intent?: string
        status?: string
        groupIdentifier?: {
            system: string
            value: string
        }
        identifier?: {system: string; value: string}[]
        code?: {
            coding: {system: string; code: string; display: string}[]
        }
    }
}

// Define the structure of the entire search result
interface PrescriptionResponse {
    resourceType: string
    type: string
    entry: PrescriptionEntry[]
}

// API endpoint for fetching prescription details
const prescriptionDetailsEndpoint = "/api/prescription-details"

export default function PrescriptionIdSearch() {
    const auth = useContext(AuthContext)

    // State variables for managing input, API response, errors, and loading state
    const [prescriptionId, setPrescriptionId] = useState<string>("")
    const [searchResult, setSearchResult] = useState<PrescriptionResponse | null>(null)
    const [error, setError] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)

    /**
     * Handles input change for the prescription ID field.
     * Updates the prescriptionId state with user input.
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrescriptionId(e.target.value)
    }

    /**
     * Handles form submission to search for a prescription.
     * Fetches prescription details from the API and updates the UI accordingly.
     */
    const handlePrescriptionDetails = async (e: React.FormEvent) => {
        e.preventDefault()
        setSearchResult(null) // Clear previous search results
        setError("") // Reset error state
        setLoading(true) // Start loading indicator

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
                    "NHSD-Session-URID": "555254242106" // Required session header
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to retrieve prescription details, Status Code: ${response.status}`)
            }

            const data = await response.json()
            console.log("Response:", data)

            setSearchResult(data) // Store successful response
            setError("") // Clear error state

        } catch (error) {
            console.error("Error retrieving prescription details:", error)
            setSearchResult(null)
            setError("Error retrieving prescription details. Please try again.")
        } finally {
            setLoading(false) // Ensure loading state is cleared
        }
    }

    /**
     * useEffect hook to log and safely access searchResult after it updates.
     * This ensures that the component responds correctly to new data.
     */
    useEffect(() => {
        if (searchResult) {
            console.log("Search result updated:", searchResult)
            console.log("Prescription ID:", searchResult?.entry?.[0]?.resource?.groupIdentifier?.value)
        }
    }, [searchResult])

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
                            <TextInput
                                id="presc-id-input"
                                name="prescriptionId"
                                aria-labelledby="presc-id-label"
                                aria-describedby="presc-id-hint"
                                value={prescriptionId}
                                maxLength={20}
                                width="20"
                                onChange={handleInputChange}
                                autoComplete="off"
                            />
                        </div>
                        {error && <p className="nhsuk-error-message">{error}</p>}
                        <Button type="submit" id="presc-id-submit">
                            {loading ? "Searching..." : PRESCRIPTION_ID_SEARCH_STRINGS.buttonText}
                        </Button>
                    </Form>
                </Col>
            </Row>

            {/* Display Loading State */}
            {loading && <p>Loading...</p>}

            {/* Display Prescription Details in Full Width */}
            {searchResult && (
                <Row>
                    <Col width="full">
                        <div className="nhsuk-panel nhsuk-panel--confirmation nhsuk-u-width-full">
                            <h2 className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline">
                                Prescription Details
                            </h2>
                            <div className="nhsuk-panel__body">
                                <p className="nhsuk-u-margin-bottom-0">
                                    <strong>Prescription ID:</strong>{" "}
                                    {searchResult.prescriptionDetails.entry?.[0]?.resource?.groupIdentifier?.value || "N/A"}
                                </p>
                                <p className="nhsuk-u-margin-bottom-0">
                                    <strong>ODS Code:</strong>{" "}
                                    {searchResult.prescriptionDetails.entry?.[0]?.resource?.author?.identifier?.value || "N/A"}
                                </p>
                                {/* Formatted JSON display */}
                                <pre
                                    className="nhsuk-panel__body"
                                    style={{
                                        background: "#f3f3f3",
                                        padding: "15px",
                                        borderRadius: "5px",
                                        overflowX: "auto",
                                        // maxHeight: "800px",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word"
                                    }}
                                >
                                    {JSON.stringify(searchResult, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </Col>
                </Row>
            )}
        </Container>
    )
}
