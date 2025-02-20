import React, {useContext, useState, useEffect} from "react"
import {Container, Row, Col, Label, HintText, TextInput, Button, Form} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"

// Interface defining the structure of the merged response
interface MergedResponse {
    prescriptionID: string
    patientDetails: {
        gender: string
        dateOfBirth: string
        address: string
    }
    prescribedItems: Array<{
        itemDetails: {
            medicationName: string
            quantity: string
            dosageInstructions: string
        }
    }>
    dispensedItems: Array<{
        itemDetails: {
            medicationName: string
            quantity: string
            dosageInstructions: string
        }
    }>
    prescriberOrganisation: {
        organisationSummaryObjective: {
            name: string
            odsCode: string
            address: string
            telephone: string
        }
    }
    json: string
}

// API endpoint for prescription details
const prescriptionDetailsEndpoint = "/api/prescription-details"

export default function PrescriptionIdSearch() {
    const auth = useContext(AuthContext)

    // State variables
    const [prescriptionId, setPrescriptionId] = useState<string>("")
    const [searchResult, setSearchResult] = useState<MergedResponse | null>(null)
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
                    "NHSD-Session-URID": "555254242106" // Required session header
                }
            })

            if (!response.ok) {
                throw new Error(`Failed to retrieve prescription details, Status Code: ${response.status}`)
            }

            const data = await response.json()
            setSearchResult({...data, json: JSON.stringify(data, null, 2)})
            setError("")

        } catch (error) {
            console.error("Error retrieving prescription details:", error)
            setSearchResult(null)
            setError("Error retrieving prescription details. Please try again.")
        } finally {
            setLoading(false) // Ensure loading state is cleared
        }
    }

    return (
        <>
            <h1>Prescription ID Search</h1>
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
                                <Label>Prescription ID</Label>
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
                            <Button type="submit">{loading ? "Searching..." : "Search"}</Button>
                        </Form>
                    </Col>
                </Row>

                {/* Loading message */}
                {loading && <p>Loading...</p>}

                {/* Display search results */}
                {searchResult && (
                    <Row>
                        <Col width="full">
                            <div className="nhsuk-panel">
                                <h2>Prescription Details</h2>
                                <p><strong>Prescription ID:</strong> {searchResult.prescriptionID}</p>
                                <h3>Patient Details</h3>
                                <p>Gender: {searchResult.patientDetails.gender}</p>
                                <p>Date of Birth: {searchResult.patientDetails.dateOfBirth}</p>
                                <p>Address: {searchResult.patientDetails.address}</p>

                                <h3>Prescribed Items</h3>
                                {searchResult.prescribedItems.map((item, index) => (
                                    <p key={index}>{item.itemDetails.medicationName} - {item.itemDetails.quantity}</p>
                                ))}

                                <h3>Dispensed Items</h3>
                                {searchResult.dispensedItems.map((item, index) => (
                                    <p key={index}>{item.itemDetails.medicationName} - {item.itemDetails.quantity}</p>
                                ))}

                                <h3>Prescriber Organisation</h3>
                                <p>{searchResult.prescriberOrganisation.organisationSummaryObjective.name}</p>
                                <p>ODS Code: {searchResult.prescriberOrganisation.organisationSummaryObjective.odsCode}</p>
                                <p>Address: {searchResult.prescriberOrganisation.organisationSummaryObjective.address}</p>
                                <p>Telephone: {searchResult.prescriberOrganisation.organisationSummaryObjective.telephone}</p>

                                {/* JSON Response Display */}
                                <h3>JSON Response</h3>
                                <pre style={{background: "#f3f3f3", padding: "15px", borderRadius: "5px", overflowX: "auto"}}>
                                    {searchResult.json}
                                </pre>
                            </div>
                        </Col>
                    </Row>
                )}
            </Container>
        </>
    )
}
