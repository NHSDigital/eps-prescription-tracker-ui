import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { BackLink, Col, Container, Row } from "nhsuk-react-components";

import { PatientDetails, SearchResponse, TreatmentType, PrescriptionStatus, PrescriptionSummary } from "@cpt-ui-common/common-types";

import { useAccess } from "@/context/AccessProvider";
import { PRESCRIPTION_LIST_PAGE_STRINGS } from "@/constants/ui-strings/PrescriptionListPageStrings";
import PrescriptionsListTabs from "@/components/prescriptionList/PrescriptionsListTab";

export default function PrescriptionListPage() {
    // TODO: mock data - in the real implementation, this would come from props or context
    const prescriptionCount = 5;

    const mockPatient: PatientDetails = {
        nhsNumber: "5900009890",
        prefix: "Mr",
        suffix: "",
        given: "William",
        family: "Wolderton",
        gender: "male",
        dateOfBirth: "01-Nov-1988",
        address: {
            line1: "55 OAK STREET",
            line2: "OAK LANE",
            city: "Leeds",
            postcode: "LS1 1XX",
        },
    }

    const mockSearchResponse: SearchResponse = {
        patient: mockPatient,
        currentPrescriptions: [
            {
                prescriptionId: "RX001",
                statusCode: PrescriptionStatus.TO_BE_DISPENSED,
                issueDate: "2025-03-01",
                prescriptionTreatmentType: TreatmentType.REPEAT,
                issueNumber: 1,
                maxRepeats: 5,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: false,
            },
            {
                prescriptionId: "RX002",
                statusCode: PrescriptionStatus.WITH_DISPENSER,
                issueDate: "2025-02-15",
                prescriptionTreatmentType: TreatmentType.ACUTE,
                issueNumber: 2,
                maxRepeats: 3,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: false,
            },
            {
                prescriptionId: "RX003",
                statusCode: PrescriptionStatus.WITH_DISPENSER_ACTIVE,
                issueDate: "2025-03-10",
                prescriptionTreatmentType: TreatmentType.ERD,
                issueNumber: 3,
                maxRepeats: 4,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: true,
            },
        ],
        pastPrescriptions: [
            {
                prescriptionId: "RX004",
                statusCode: PrescriptionStatus.DISPENSED,
                issueDate: "2025-01-15",
                prescriptionTreatmentType: TreatmentType.REPEAT,
                issueNumber: 1,
                maxRepeats: 2,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: false,
            },
            {
                prescriptionId: "RX005",
                statusCode: PrescriptionStatus.NOT_DISPENSED,
                issueDate: "2024-12-20",
                prescriptionTreatmentType: TreatmentType.ACUTE,
                issueNumber: 1,
                maxRepeats: 1,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: false,
            },
        ],
        futurePrescriptions: [
            {
                prescriptionId: "RX006",
                statusCode: PrescriptionStatus.FUTURE_DATED_PRESCRIPTION,
                issueDate: "2025-04-01",
                prescriptionTreatmentType: TreatmentType.REPEAT,
                issueNumber: 1,
                maxRepeats: 10,
                prescriptionPendingCancellation: false,
                itemsPendingCancellation: false,
            },
        ],
    };


    const location = useLocation();
    const [backLinkTarget, setBackLinkTarget] = useState<string>(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET);
    const [futurePrescriptions, setFuturePrescriptions] = useState<PrescriptionSummary[]>([])
    const [pastPrescriptions, setPastPrescriptions] = useState<PrescriptionSummary[]>([])
    const [currentPrescriptions, setCurrentPrescriptions] = useState<PrescriptionSummary[]>([])

    const { setPatientDetails } = useAccess()

    // Update the data with the mock object defined above. TEMPORARY!
    // TODO: Use real data here
    useEffect(() => {
        setPastPrescriptions(mockSearchResponse.pastPrescriptions)
        setFuturePrescriptions(mockSearchResponse.futurePrescriptions)
        setCurrentPrescriptions(mockSearchResponse.currentPrescriptions)
        setPatientDetails(mockSearchResponse.patient)
    }, [mockSearchResponse])

    useEffect(() => {
        // parse the current URL's query parameters
        const queryParams = new URLSearchParams(location.search);

        // determine which search page to go back to based on query parameters
        if (queryParams.has('prescriptionId')) {
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET);
        } else if (queryParams.has('nhsNumber')) {
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET);
        } else {
            // default fallback
            setBackLinkTarget(PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET);
        }

        setPatientDetails(mockPatient)
    }, [location]);

    return (
        <>
            <title>{PRESCRIPTION_LIST_PAGE_STRINGS.PAGE_TITLE}</title>
            <main id="prescription-list" data-testid="prescription-list-page">
                <Container className="hero-container" data-testid="prescription-list-hero-container">
                    <Row>
                        <Col width="full">
                            <nav className="nhsuk-breadcrumb" aria-label="Breadcrumb" data-testid="prescription-list-nav">
                                <Link to={backLinkTarget} data-testid="back-link-container">
                                    <BackLink data-testid="go-back-link">{PRESCRIPTION_LIST_PAGE_STRINGS.GO_BACK_LINK_TEXT}</BackLink>
                                </Link>
                            </nav>
                        </Col>
                    </Row>
                    <Row>
                        <Col width="full">
                            <h2 className="nhsuk-heading-l" data-testid="prescription-list-heading">
                                {PRESCRIPTION_LIST_PAGE_STRINGS.HEADING}
                            </h2>
                        </Col>
                    </Row>
                </Container>
                <Container className="results-container" data-testid="prescription-results-container">
                    <p data-testid="results-heading">
                        <strong data-testid="results-count">
                            {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}
                            {prescriptionCount}
                            {PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}
                        </strong>
                    </p>
                    <div data-testid="prescription-results-list">
                        <PrescriptionsListTabs
                            currentPrescriptions={currentPrescriptions}
                            pastPrescriptions={pastPrescriptions}
                            futurePrescriptions={futurePrescriptions}
                        />
                    </div>
                </Container>
            </main>
        </>
    );
}
