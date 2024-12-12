'use client'
import React, {useState, useEffect, useContext, useCallback } from "react"

import {Container, Col, Row, Details, Table, ErrorSummary } from "nhsuk-react-components"
import { AuthContext } from "@/context/AuthContext";

export type RoleDetails = {
    role_name?: string;
    role_id?: string;
    org_code?: string;
    org_name?: string;
    site_name?: string;
    site_address?: string;
};

export type TrackerUserInfo = {
    roles_with_access: Array<RoleDetails>;
    roles_without_access: Array<RoleDetails>;
    currently_selected_role?: RoleDetails;
};


import {staticRoleData} from "./test_data";

const trackerUserInfoEndpoint = "/api/tracker-user-info"

export default function SelectYourRolePage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string|null>(null)
    const [trackerUserInfoData, setTrackerUserInfoData] = useState<TrackerUserInfo|null>(staticRoleData)

    const auth = useContext(AuthContext);

    const fetchTrackerUserInfo = useCallback(async () => {
        setLoading(true)
        setTrackerUserInfoData(null)
        setError(null)

        if ( !auth?.isSignedIn || !auth ) {
            setLoading(false)
            setError("Not signed in")
        }

        try {
        const response = await fetch(trackerUserInfoEndpoint, {
            headers: {
                Authorization: `Bearer ${auth?.idToken}`,
                'NHSD-Session-URID': '555254242106'
            }
        })
        const data = await response.json()
            setTrackerUserInfoData(data)
        } catch (err) {
            setError("Failed to fetch CPT user info")
            console.error("error fetching tracker user info:", err)
        } finally {
            setLoading(false)
        }
    }, [auth])

    useEffect(() => {
        if (auth?.isSignedIn) {
            fetchTrackerUserInfo()
        }
    }, [auth?.isSignedIn, fetchTrackerUserInfo])

    // If the data is being fetched, replace the content with a spinner
    if (loading) {
        return (
            <main className="nhsuk-main-wrapper">
                <Container>
                    <Row>
                        <Col width="full">
                            <p>Loading...</p>
                        </Col>
                    </Row>
                </Container>
            </main>
        );
    }


    // If the process encounters an error, replace the content with an error summary
    if (error) {
        return (
            <main className="nhsuk-main-wrapper">
                <Container>
                    <Row>
                        <ErrorSummary>
                            <ErrorSummary.Title>
                                <p>Error during role selection</p>
                            </ErrorSummary.Title>
                            <ErrorSummary.List>
                                {/* FIXME: Where should this link out to?? */}
                                <ErrorSummary.Item href="PLACEHOLDER/contact/us">
                                    {error}
                                </ErrorSummary.Item>
                            </ErrorSummary.List>
                        </ErrorSummary>
                    </Row>
                </Container>
            </main>
        );
    }


    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Container role="contentinfo">
                        <Row>
                            <Col width="full">
                                <h1 className='nhsuk-heading-xl '>
                                    <span role="text">Select your role
                                        <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                            <span className="nhsuk-u-visually-hidden"> - </span>
                                            Select the role you wish to use to access the service.
                                        </span></span></h1>
                            </Col>
                        </Row>
                        <Row>
                            <Details expander>
                                <Details.Summary>
                                    Roles without access
                                </Details.Summary>
                                <Details.Text>
                                    <Table>
                                        <Table.Head>
                                            <Table.Row>
                                                <Table.Cell>Organisation</Table.Cell>
                                                <Table.Cell>Role</Table.Cell>
                                            </Table.Row>
                                        </Table.Head>
                                        <Table.Body>
                                            {trackerUserInfoData?.roles_without_access?.map((role, index) => (
                                                <Table.Row key={index}>
                                                <Table.Cell>
                                                    {role.org_name ? role.org_name : "NO ORG NAME"} (ODS: {role.org_code})
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {role.role_name}
                                                </Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table>
                                </Details.Text>
                            </Details>
                        </Row>
                    </Container>
                </Row>
            </Container>
        </main>
    )
}
