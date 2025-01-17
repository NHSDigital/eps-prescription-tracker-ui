'use client'
import React, { useState, useEffect, useContext } from "react"
import { useRouter } from 'next/navigation'
import { Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText } from "nhsuk-react-components"

import { AuthContext } from "@/context/AuthProvider"
import { useAccess } from '@/context/AccessProvider'

import EpsCard, { EpsCardProps } from "@/components/EpsCard"
import EpsSpinner from "@/components/EpsSpinner"

import { RoleDetails, TrackerUserInfo } from "@/types/TrackerUserInfoTypes"

// Extends the EpsCardProps to include a unique identifier
export type RolesWithAccessProps = EpsCardProps & {
    uuid: string
}

export type RolesWithoutAccessProps = {
    uuid: string
    orgName: string
    odsCode: string
    roleName: string
}

const trackerUserInfoEndpoint = "/api/tracker-user-info"

interface RoleSelectionPageProps {
    // contentText is where we pass in all the strings used on this page
    contentText: {
        title: string
        caption: string
        titleNoAccess: string
        captionNoAccess: string
        insetText: {
            visuallyHidden: string
            message: string
        }
        confirmButton: {
            link: string
            text: string
        }
        alternativeMessage: string
        organisation: string
        role: string
        roles_without_access_table_title: string
        noOrgName: string
        rolesWithoutAccessHeader: string
        noODSCode: string
        noRoleName: string
        noAddress: string
        errorDuringRoleSelection: string
    }
}

export default function RoleSelectionPage({ contentText }: RoleSelectionPageProps) {
    // Destructure strings from the contentText prop
    const {
        title,
        caption,
        titleNoAccess,
        captionNoAccess,
        insetText,
        confirmButton,
        alternativeMessage,
        organisation,
        role,
        roles_without_access_table_title,
        noOrgName,
        rolesWithoutAccessHeader,
        noODSCode,
        noRoleName,
        noAddress,
        errorDuringRoleSelection
    } = contentText

    const { noAccess, setNoAccess, setSingleAccess } = useAccess()
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [redirecting, setRedirecting] = useState<boolean>(false)
    const [rolesWithAccess, setRolesWithAccess] = useState<RolesWithAccessProps[]>([])
    const [rolesWithoutAccess, setRolesWithoutAccess] = useState<RolesWithoutAccessProps[]>([])
    const [currentlySelectedRole, setCurrentlySelectedRole] = useState<RoleDetails | undefined>(undefined)
    const [loginInfoMessage, setLoginInfoMessage] = useState<string>("")

    const router = useRouter()
    const auth = useContext(AuthContext)

    useEffect(() => {
        if (!currentlySelectedRole) {
            setLoginInfoMessage("");
            return;
        }

        const { org_name, org_code, role_name } = currentlySelectedRole;
        const displayOrgName = org_name || noOrgName;
        const displayOrgCode = org_code || noODSCode;
        const displayRoleName = role_name || noRoleName;

        const message = `You are currently logged in at ${displayOrgName} (ODS: ${displayOrgCode}) with ${displayRoleName}.`;
        setLoginInfoMessage(message);
    }, [
        currentlySelectedRole,
        noOrgName,
        noODSCode,
        noRoleName
    ])

    useEffect(() => {
        setLoading(true);
        setError(null);
        setRolesWithAccess([]);
        setRolesWithoutAccess([]);
        setCurrentlySelectedRole(undefined)

        if (!auth?.isSignedIn || !auth?.idToken) {
            setError(null);
            return;
        }
        // Now that we know there is an id token, check that it has a toString property.
        // For some reason, it doesn't have this immediately, it gets added after a brief pause.
        if (!auth?.idToken.hasOwnProperty('toString')) {
            setError(null);
            return;
        }

        fetch(trackerUserInfoEndpoint, {
            headers: {
                Authorization: `Bearer ${auth?.idToken}`,
                'NHSD-Session-URID': '555254242106',
            },
        })
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error(
                        `Server did not return CPT user info, response ${response.status}`
                    );
                }
                return response.json();
            })
            .then((data) => {
                if (!data.userInfo) {
                    throw new Error("Server response did not contain data");
                }

                const userInfo: TrackerUserInfo = data.userInfo

                const rolesWithAccess = userInfo.roles_with_access
                const rolesWithoutAccess = userInfo.roles_without_access
                // Unused for now
                // const currentlySelectedRole = userInfo.currently_selected_role ? {
                //     ...userInfo.currently_selected_role,
                //     uuid: `selected_role_0`
                // } : undefined

                setNoAccess(rolesWithAccess.length === 0);
                setSingleAccess(rolesWithAccess.length === 1);

                setRolesWithAccess(
                    rolesWithAccess.map((role: RoleDetails, index: number) => ({
                        uuid: `{role_with_access_${index}}`,
                        orgName: role.org_name || noOrgName,
                        odsCode: role.org_code || noODSCode,
                        siteAddress: role.site_address || noAddress,
                        roleName: role.role_name || noRoleName,
                        link: "/yourselectedrole",
                    }))
                );

                setRolesWithoutAccess(
                    rolesWithoutAccess.map((role: RoleDetails, index: number) => ({
                        uuid: `{role_without_access_${index}}`,
                        roleName: role.role_name ? role.role_name : noRoleName,
                        orgName: role.org_name ? role.org_name : noOrgName,
                        odsCode: role.org_code ? role.org_code : noODSCode
                    }))
                )

                setNoAccess(rolesWithAccess.length === 0)
                setSingleAccess(rolesWithAccess.length === 1)

                // If the user has exactly one accessible role and zero roles without access,
                // redirect them immediately
                if (rolesWithAccess.length === 1 && rolesWithoutAccess.length === 0) {
                    setRedirecting(true);
                    router.push("/searchforaprescription");
                    return;
                }
            })
            .catch((err) => {
                setError("Failed to fetch CPT user info");
                console.error("Error fetching tracker user info:", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [
        auth,
        router,
        setNoAccess,
        setSingleAccess,
        noOrgName,
        noODSCode,
        noAddress,
        noRoleName,
    ]);


    useEffect(() => {
        console.log("Auth error updated:", auth?.error)
        // Have to do this to make `<string | null | undefined>` work with `<string | null>`
        setError(auth?.error ?? null)
        if (auth?.error) {
            setLoading(false)
        }
    }, [auth?.error])

    // If the process encounters an error, replace the content with an error summary
    if (error) {
        return (
            <main id="main-content" className="nhsuk-main-wrapper">
                <Container>
                    <Row>
                        <ErrorSummary>
                            <ErrorSummary.Title>
                                {errorDuringRoleSelection}
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
        )
    }

    // If the data is being fetched, replace the content with a spinner
    if (loading || redirecting) {
        return (
            <main id="main-content" className="nhsuk-main-wrapper">
                <Container>
                    <Row>
                        <Col width="full">
                            <EpsSpinner />
                        </Col>
                    </Row>
                </Container>
            </main>
        )
    }

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container role="contentinfo">
                {/* Title Section */}
                <Row>
                    <Col width="two-thirds">
                        <h1 className="nhsuk-heading-xl">
                            <span role="text" data-testid="eps_header_selectYourRole">
                                <span className="nhsuk-title">
                                    {noAccess ? titleNoAccess : title}
                                </span>
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    {!noAccess && caption}
                                </span>
                            </span>
                        </h1>
                        {/* Caption Section for No Access */}
                        {noAccess && (<p>{captionNoAccess}</p>)}
                        {/* Inset Text Section */}
                        {currentlySelectedRole && (
                            <section aria-label="Login Information">
                                <InsetText>
                                    <span className="nhsuk-u-visually-hidden">
                                        {insetText.visuallyHidden}
                                    </span>
                                    <p dangerouslySetInnerHTML={{ __html: loginInfoMessage }}></p>
                                </InsetText>
                                {/* Confirm Button */}
                                <Button href={confirmButton.link}>
                                    {confirmButton.text}
                                </Button>
                                <p>{alternativeMessage}</p>
                            </section>
                        )}
                    </Col>

                    {/* Roles with access Section */}
                    {!noAccess && (
                        <Col width="two-thirds">
                            <div className="section" >
                                {rolesWithAccess.map((role: RolesWithAccessProps) => (
                                    <EpsCard {...role} key={role.uuid} />
                                ))}
                            </div>
                        </Col>
                    )}

                    {/* Roles without access Section */}
                    <Col width="two-thirds">
                        <h3>{rolesWithoutAccessHeader}</h3>
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
                                        {rolesWithoutAccess.map((roleItem: RolesWithoutAccessProps) => (
                                            <Table.Row key={roleItem.uuid}>
                                                <Table.Cell data-testid="change-role-name-cell">
                                                    {roleItem.orgName} (ODS: {roleItem.odsCode})
                                                </Table.Cell>
                                                <Table.Cell data-testid="change-role-role-cell">
                                                    {roleItem.roleName}
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
    )
}
