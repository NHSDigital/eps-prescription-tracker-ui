import React, {useContext, useState, useEffect} from "react"
import {Container, Row, Col, Label, HintText, TextInput, Button, Form} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {MergedResponse as MergedResponseBackend} from "../../../../prescriptionDetailsLambda/src/utils/types"

interface MergedResponse extends MergedResponseBackend {
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
                                <p><strong>Prescription ID:</strong> {searchResult?.prescriptionID}</p>

                                {/* Patient Details */}
                                <h3>Patient Details</h3>
                                <p><strong>Gender:</strong> {searchResult?.patientDetails?.gender}</p>
                                <p><strong>Date of Birth:</strong> {searchResult?.patientDetails?.dateOfBirth}</p>
                                <p><strong>Address:</strong> {searchResult?.patientDetails?.address}</p>

                                {/* Prescription Summary */}
                                <h3>Prescription Summary</h3>
                                <p><strong>Type Code:</strong> {searchResult?.typeCode}</p>
                                <p><strong>Status Code:</strong> {searchResult?.statusCode}</p>
                                <p><strong>Issue Date:</strong> {searchResult?.issueDate}</p>
                                <p><strong>Instance Number:</strong> {searchResult?.instanceNumber}</p>
                                <p><strong>Max Repeats:</strong> {searchResult?.maxRepeats}</p>
                                <p><strong>Days Supply:</strong> {searchResult?.daysSupply}</p>
                                <p><strong>Pending Cancellation:</strong> {searchResult?.prescriptionPendingCancellation ? "Yes" : "No"}</p>

                                {/* Prescribed Items */}
                                <h3>Prescribed Items</h3>
                                {searchResult.prescribedItems.map((item, index) => (
                                    <div key={index} style={{marginBottom: "10px"}}>
                                        <p><strong>Medication Name:</strong> {item.itemDetails.medicationName}</p>
                                        <p><strong>Quantity:</strong> {item.itemDetails.quantity}</p>
                                        <p><strong>Dosage Instructions:</strong> {item.itemDetails.dosageInstructions}</p>
                                        <p><strong>EPS Status Code:</strong> {item.itemDetails.epsStatusCode}</p>
                                        <p><strong>Pending Cancellation:</strong> {item.itemDetails.itemPendingCancellation ? "Yes" : "No"}</p>
                                        {item.itemDetails.cancellationReason && (
                                            <p><strong>Cancellation Reason:</strong> {item.itemDetails.cancellationReason}</p>
                                        )}
                                    </div>
                                ))}

                                {/* Dispensed Items */}
                                <h3>Dispensed Items</h3>
                                {searchResult.dispensedItems.map((item, index) => (
                                    <div key={index} style={{marginBottom: "10px"}}>
                                        <p><strong>Medication Name:</strong> {item.itemDetails.medicationName}</p>
                                        <p><strong>Quantity:</strong> {item.itemDetails.quantity}</p>
                                        <p><strong>Dosage Instructions:</strong> {item.itemDetails.dosageInstructions}</p>
                                        <p><strong>EPS Status Code:</strong> {item.itemDetails.epsStatusCode}</p>
                                        <p><strong>Pending Cancellation:</strong> {item.itemDetails.itemPendingCancellation ? "Yes" : "No"}</p>
                                        {item.itemDetails.cancellationReason && (
                                            <p><strong>Cancellation Reason:</strong> {item.itemDetails.cancellationReason}</p>
                                        )}
                                        {item.itemDetails.notDispensedReason && (
                                            <p><strong>Not Dispensed Reason:</strong> {item.itemDetails.notDispensedReason}</p>
                                        )}
                                        {item.itemDetails.initiallyPrescribed && (
                                            <div style={{marginLeft: "20px"}}>
                                                <p><strong>Initially Prescribed:</strong></p>
                                                <p><strong>Medication Name:</strong> {item.itemDetails.initiallyPrescribed.medicationName}</p>
                                                <p><strong>Quantity:</strong> {item.itemDetails.initiallyPrescribed.quantity}</p>
                                                <p><strong>Dosage Instruction:</strong> {item.itemDetails.initiallyPrescribed.dosageInstruction}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Message History */}
                                <h3>Message History</h3>
                                {searchResult.messageHistory.map((message, index) => (
                                    <div key={index} style={{marginBottom: "10px"}}>
                                        <p><strong>Message Code:</strong> {message.messageCode}</p>
                                        <p><strong>Sent DateTime:</strong> {message.sentDateTime}</p>
                                        <p><strong>Organisation Name:</strong> {message.organisationName}</p>
                                        <p><strong>Organisation ODS:</strong> {message.organisationODS}</p>
                                        <p><strong>New Status Code:</strong> {message.newStatusCode}</p>
                                        {message.dispenseNotification && message.dispenseNotification.map((notification, idx) => (
                                            <div key={idx} style={{marginLeft: "20px"}}>
                                                <p><strong>ID:</strong> {notification.ID}</p>
                                                <p><strong>Medication Name:</strong> {notification.medicationName}</p>
                                                <p><strong>Quantity:</strong> {notification.quantity}</p>
                                                <p><strong>Dosage Instruction:</strong> {notification.dosageInstruction}</p>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {/* Prescriber Organisation */}
                                <h3>Prescriber Organisation</h3>
                                <p><strong>Name:</strong> {searchResult.prescriberOrganisation.organisationSummaryObjective.name}</p>
                                <p><strong>ODS Code:</strong> {searchResult.prescriberOrganisation.organisationSummaryObjective.odsCode}</p>
                                <p><strong>Address:</strong> {searchResult.prescriberOrganisation.organisationSummaryObjective.address}</p>
                                <p><strong>Telephone:</strong> {searchResult.prescriberOrganisation.organisationSummaryObjective.telephone}</p>
                                <p><strong>Prescribed From:</strong> {searchResult.prescriberOrganisation.organisationSummaryObjective.prescribedFrom}</p>

                                {/* Nominated Dispenser */}
                                {searchResult.nominatedDispenser && (
                                    <>
                                        <h3>Nominated Dispenser</h3>
                                        <p><strong>Name:</strong> {searchResult.nominatedDispenser.organisationSummaryObjective.name}</p>
                                        <p><strong>ODS Code:</strong> {searchResult.nominatedDispenser.organisationSummaryObjective.odsCode}</p>
                                        <p><strong>Address:</strong> {searchResult.nominatedDispenser.organisationSummaryObjective.address}</p>
                                        <p><strong>Telephone:</strong> {searchResult.nominatedDispenser.organisationSummaryObjective.telephone}</p>
                                    </>
                                )}

                                {/* Current Dispenser */}
                                {searchResult.currentDispenser && (
                                    <>
                                        <h3>Current Dispenser</h3>
                                        <p><strong>Name:</strong> {searchResult.currentDispenser.organisationSummaryObjective.name}</p>
                                        <p><strong>ODS Code:</strong> {searchResult.currentDispenser.organisationSummaryObjective.odsCode}</p>
                                        <p><strong>Address:</strong> {searchResult.currentDispenser.organisationSummaryObjective.address}</p>
                                        <p><strong>Telephone:</strong> {searchResult.currentDispenser.organisationSummaryObjective.telephone}</p>
                                    </>
                                )}

                                {/* JSON Response Display */}
                                <h3>Full JSON Response</h3>
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
