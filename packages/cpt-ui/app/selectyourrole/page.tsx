'use client'
import React, {useState, useEffect, useContext, useCallback } from "react"
import { Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText } from "nhsuk-react-components"
import { AuthContext } from "@/context/AuthProvider";
import EpsCard from "@/components/EpsCard";
import {SELECT_ROLE_PAGE_TEXT} from "@/constants/ui-strings/CardStrings";

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
    const [loading, setLoading] = useState(false)
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
        if (auth?.isSignedIn === undefined) {
            return
        }
    
        if (auth?.isSignedIn) {
            fetchTrackerUserInfo()
        } else {
            setError("No login session found")
        }
    }, [auth?.isSignedIn, fetchTrackerUserInfo])

    // If the data is being fetched, replace the content with a spinner
    if (loading) {
        return (
            <main id="main-content" className="nhsuk-main-wrapper">
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
            <main id="main-content" className="nhsuk-main-wrapper">
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

    const { title, caption, insetText, confirmButton, alternativeMessage, organisation, role } =
        SELECT_ROLE_PAGE_TEXT;

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container role="contentinfo">
                {/* Title Section */}
                <Row>
                    <Col width="two-thirds">
                        <h1 className='nhsuk-heading-xl '>
                            <span role="text">
                                {title}
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    {caption}
                                </span>
                            </span>
                        </h1 >
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

                    {/* Roles with access Section */}
                    <Col width="two-thirds">
                    <div className="section" >
                        {trackerUserInfoData?.roles_without_access?.map((role, index) => (
                                <EpsCard key={index}
                                    orgName={role.org_name ? role.org_name : "No Org Name"}
                                    odsCode={role.org_code ? role.org_code : "No ODS Code"}
                                    siteAddress={role.site_address ? role.site_address : "Address not found"}
                                    roleName={
                                        role.role_name 
                                            ? String(role.role_name).split(":").pop()?.replace(/['"]+/g, "").trim() || "No Role Name"
                                            : "No Role Name"
                                    }
                                    link="site/selectrole"
                                />
                        ))}
                    </div>
                    </Col>

                    {/* Roles without access Section */}
                    <Col width="two-thirds">
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
                    </Col>
                </Row>
            </Container>
        </main>
    );
}
