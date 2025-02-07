'use client'
import React, { useState, useEffect, useContext, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText } from "nhsuk-react-components"

import { AuthContext } from "@/context/AuthProvider"
import { useAccess } from '@/context/AccessProvider'

import EpsCard from "@/components/EpsCard"
import EpsSpinner from "@/components/EpsSpinner"

import { RoleDetails, TrackerUserInfo } from "@/types/TrackerUserInfoTypes"

import http from "@/helpers/axios"

// This is passed to the EPS card component.
export type RolesWithAccessProps = {
    role: RoleDetails
    link: string
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
        errorDuringRoleSelection
    } = contentText

    const { noAccess, setNoAccess, setSingleAccess, selectedRole, setSelectedRole } = useAccess()
    const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [redirecting, setRedirecting] = useState<boolean>(false)
    const [rolesWithAccess, setRolesWithAccess] = useState<RolesWithAccessProps[]>([])
    const [rolesWithoutAccess, setRolesWithoutAccess] = useState<RolesWithoutAccessProps[]>([])

    const router = useRouter()
    const auth = useContext(AuthContext)

    useEffect(() => {
        if (!loginInfoMessage && selectedRole) {
            setLoginInfoMessage(
                `You are currently logged in at ${selectedRole.org_name || noOrgName
                } (ODS: ${selectedRole.org_code || noODSCode
                }) with ${selectedRole.role_name || noRoleName
                }.`
            )
        }
    }, [selectedRole, loginInfoMessage, noOrgName, noODSCode, noRoleName])

    // TODO: This should be moved to the access provider, and the state passed in c.f. selectedRole
    // Instead, this should be a useEffect that triggers when rolesWithAccess, rolesWithoutAccess, or selectedRole changes.
    const fetchTrackerUserInfo = useCallback(async () => {
        if (!auth?.isSignedIn || !auth || !auth.idToken) {
            return
        }

        // On DOM load, for some reason the toString property is missing, which causes the 
        // Bearer token to be "Bearer [object Object]". 
        // Don't bother making bum requests.
        if (!auth.idToken.hasOwnProperty("toString")) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await http.get(trackerUserInfoEndpoint, {
                headers: {
                    Authorization: `Bearer ${auth.idToken}`,
                    'NHSD-Session-URID': '555254242106',
                },
            })

            if (response.status !== 200) {
                throw new Error(`Server did not return CPT user info, response ${response.status}`)
            }

            const data = await response.data

            if (!data.userInfo) {
                throw new Error("Server response did not contain data")
            }

            const userInfo: TrackerUserInfo = data.userInfo

            const rolesWithAccess = userInfo.roles_with_access || []
            const rolesWithoutAccess = userInfo.roles_without_access || []

            // Check if the user info object and currently_selected_role exist
            const selectedRole =
                userInfo?.currently_selected_role && Object.keys(userInfo.currently_selected_role).length > 0
                    ? {
                        // If currently_selected_role is not empty, spread its properties
                        ...userInfo.currently_selected_role,
                        // Add uuid only if the selected role is not an empty object
                        uuid: `selected_role_0`
                    }
                    // If currently_selected_role is an empty object `{}`, set selectedRole to undefined
                    : undefined

            setSelectedRole(selectedRole)

            // Populate the EPS card props
            setRolesWithAccess(
                rolesWithAccess.map((role: RoleDetails, index: number) => ({
                    uuid: `{role_with_access_${index}}`,
                    role,
                    link: "/yourselectedrole"
                }))
            )

            setRolesWithoutAccess(
                rolesWithoutAccess.map((role: RoleDetails, index: number) => ({
                    uuid: `{role_without_access_${index}}`,
                    roleName: role.role_name ? role.role_name : noRoleName,
                    orgName: role.org_name ? role.org_name : noOrgName,
                    odsCode: role.org_code ? role.org_code : noODSCode
                }))
            )

            setNoAccess(rolesWithAccess.length === 0 && selectedRole === undefined)
            setSingleAccess(rolesWithAccess.length === 1)

            // If the user has exactly one accessible role and zero roles without access,
            // redirect them immediately
            if (rolesWithAccess.length === 1 && rolesWithoutAccess.length === 0) {
                setRedirecting(true)
                setSelectedRole(rolesWithAccess[0])
                router.push("/searchforaprescription")
                return
            }

        } catch (err) {
            setError("Failed to fetch CPT user info")
            console.error("Error fetching tracker user info:", err)
        } finally {
            setLoading(false)
        }
    }, [
        auth,
        router,
        setNoAccess,
        setSingleAccess,
        setSelectedRole,
        noOrgName,
        noODSCode,
        noRoleName
    ])

    useEffect(() => {
        if (auth?.isSignedIn) {
            fetchTrackerUserInfo()
        }
    }, [auth?.isSignedIn, fetchTrackerUserInfo])

    useEffect(() => {
        console.log("Auth error updated:", auth?.error)
        // Have to do this to make `<string | null | undefined>` work with `<string | null>`
        setError(auth?.error ?? null)
        if (auth?.error) {
            setLoading(false)
        }
    }, [auth?.error])

    const handleSearchForPrescriptionRedirect = async (e: React.MouseEvent | React.KeyboardEvent) => {
        // Naked href don't respect the router, so this overrides that
        e.preventDefault()
        router.push("/searchforaprescription")
    }

    // If the data is being fetched or the user is being diverted, replace the content with a spinner
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

    return (
        <main id="main-content" className="nhsuk-main-wrapper" data-testid="eps_roleSelectionComponent">
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
                        {/* Pre selected role section */}
                        {selectedRole !== undefined && (
                            <section aria-label="Login Information">
                                <InsetText
                                    data-testid="eps_select_your_role_pre_role_selected"
                                >
                                    <span className="nhsuk-u-visually-hidden">
                                        {insetText.visuallyHidden}
                                    </span>
                                    {loginInfoMessage && (
                                        <p dangerouslySetInnerHTML={{ __html: loginInfoMessage }}></p>
                                    )}
                                </InsetText>
                                {/* Confirm Button */}
                                <Button href={confirmButton.link} onClick={handleSearchForPrescriptionRedirect}>
                                    {confirmButton.text}
                                </Button>
                                {rolesWithAccess.length > 0 && (
                                    <p>{alternativeMessage}</p>
                                )}
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
