'use client'
import React, {useState, useEffect, useContext, useCallback } from "react"
import { Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText } from "nhsuk-react-components"
import { AuthContext } from "@/context/AuthContext";
import EpsCard from "@/components/EpsCard";
import {
  ROLE_CARDS,
  SELECT_ROLE_PAGE_TEXT,
} from "@/constants/ui-strings/CardStrings";

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

const trackerUserInfoEndpoint = "/api/tracker-user-info"

export default function SelectYourRolePage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string|null>(null)
    const [trackerUserInfoData, setTrackerUserInfoData] = useState<TrackerUserInfo|null>(null)

    const auth = useContext(AuthContext);

    const fetchTrackerUserInfo = useCallback(async () => {
        setLoading(true)
        setTrackerUserInfoData(null)
        setError(null)

        if (!auth?.isSignedIn || !auth) {
            setLoading(false)
            setError("Not signed in")
            return;
        }

        try {
            const response = await fetch(trackerUserInfoEndpoint, {
                headers: {
                    Authorization: `Bearer ${auth?.idToken}`,
                    'NHSD-Session-URID': '555254242106'
                }
            })
            
            if (response.status !== 200) {
                throw new Error("Server did not return CPT user info")
            }

            const data = await response.json()

            if (!data.userInfo) {
                throw new Error("Server response did not contain data")
            }

            setTrackerUserInfoData(data.userInfo)
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
        } else {
            setError("No login session found")
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

    const { title, caption, insetText, confirmButton, alternativeMessage, organisation, role, roles_without_access_table_title } =
        SELECT_ROLE_PAGE_TEXT;

    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                {/* Title Section */}
                <Row>
                    <Col width="full">
                        <h1 className='nhsuk-heading-xl'>
                            <span role="text">
                                {title}
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    {caption}
                                </span>
                            </span>
                        </h1>
                    </Col>
                </Row>

                <Row>
                    <Container role="contentinfo">
                        <Row>
                            <Col width="full">
                                {/* Inset Text Section */}
                                <section aria-label="Login Information">
                                    <InsetText>
                                        <span className="nhsuk-u-visually-hidden">{insetText.visuallyHidden}</span>
                                        <p>{insetText.message}</p>
                                    </InsetText>
                                    {/* Confirm Button */}
                                    <Button href={confirmButton.link}>{confirmButton.text}</Button>
                                    <p>{alternativeMessage}</p>
                                </section>
                            </Col>
                        </Row>

                        {/* Roles with access Section */}
                        <Row>
                            {ROLE_CARDS.map((role, index) => (
                                <Col width="two-thirds" key={index}>
                                    <EpsCard
                                        name={role.name}
                                        odsCode={role.odsCode}
                                        address={role.address}
                                        specialty={role.specialty}
                                        link={role.link}
                                    />
                                </Col>
                            ))}
                        </Row>

                        {/* Roles without access Section */}
                        <Row>
                            <Details expander>
                                <Details.Summary>
                                    {roles_without_access_table_title}
                                </Details.Summary>
                                <Details.Text>
                                    <Table>
                                        <Table.Head>
                                            <Table.Row>
                                                <Table.Cell>{organisation}</Table.Cell>
                                                <Table.Cell>{role}</Table.Cell>
                                            </Table.Row>
                                        </Table.Head>
                                        <Table.Body>
                                            {trackerUserInfoData?.roles_without_access?.map((role, index) => (
                                                <Table.Row key={index}>
                                                    <Table.Cell>
                                                        {role.org_name ? role.org_name : "No Org Name"} (ODS: {role.org_code})
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {role.role_name?.replace(/"/g, '').split(':').pop()}
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
    );
}
