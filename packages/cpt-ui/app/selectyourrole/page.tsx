'use client'
import React, {useState, useEffect, useContext, useCallback} from "react"
import {Container, Col, Row, Details, Table, ErrorSummary, Button, InsetText} from "nhsuk-react-components"
import {AuthContext} from "@/context/AuthProvider"
import EpsCard, {EpsCardProps} from "@/components/EpsCard"
import {SELECT_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/CardStrings"

export type RoleDetails = {
    role_name?: string
    role_id?: string
    org_code?: string
    org_name?: string
    site_name?: string
    site_address?: string
    uuid?: string
}

export type TrackerUserInfo = {
    roles_with_access: Array<RoleDetails>
    roles_without_access: Array<RoleDetails>
    currently_selected_role?: RoleDetails
}

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

const {
    title,
    caption,
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
    errorDuringRoleSelection,
    loadingMessage
} = SELECT_YOUR_ROLE_PAGE_TEXT

export default function SelectYourRolePage() {
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [redirecting, setRedirecting] = useState<boolean>(false)
    const [rolesWithAccess, setRolesWithAccess] = useState<RolesWithAccessProps[]>([])
    const [rolesWithoutAccess, setRolesWithoutAccess] = useState<RolesWithoutAccessProps[]>([])

    const auth = useContext(AuthContext)

    const fetchTrackerUserInfo = useCallback(async () => {
        setLoading(true)
        setError(null)
        setRolesWithAccess([])
        setRolesWithoutAccess([])

        if (!auth?.isSignedIn || !auth) {
            setError("Not signed in")
            setLoading(false)
            return
        }

        try {
            const response = await fetch(trackerUserInfoEndpoint, {
                headers: {
                    Authorization: `Bearer ${auth?.idToken}`,
                    'NHSD-Session-URID': '555254242106'
                }
            })

            if (response.status !== 200) {
                throw new Error(`Server did not return CPT user info, response ${response.status}`)
            }

            const data = await response.json()

            if (!data.userInfo) {
                throw new Error("Server response did not contain data")
            }

            const userInfo: TrackerUserInfo = data.userInfo

            const rolesWithAccess = userInfo.roles_with_access
            const rolesWithoutAccess = userInfo.roles_without_access
            // Unused for now
            // const currentlySelectedRole = userInfo.currently_selected_role ? {
            //     ...userInfo.currently_selected_role,
            //     uuid: `selected_role_0`
            // } : undefined

            // Populate the EPS card props
            setRolesWithAccess(
                rolesWithAccess.map((role: RoleDetails, index: number) => ({
                    uuid: `{role_with_access_${index}}`,
                    orgName: role.org_name ? role.org_name : noOrgName,
                    odsCode: role.org_code ? role.org_code : noODSCode,
                    siteAddress: role.site_address ? role.site_address : noAddress,
                    roleName: role.role_name ? role.role_name : noRoleName,
                    link: "yourselectedrole"
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

            // Redirect if conditions are met
            if (rolesWithAccess.length === 1 && rolesWithoutAccess.length === 0) {
                setRedirecting(true)
                window.location.href = "/searchforaprescription"
                return
            }

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
            setError(null)
        }
    }, [auth?.isSignedIn, fetchTrackerUserInfo])

    // Skip rendering if redirecting
    if (redirecting) {
        return null
    }

    // If the data is being fetched, replace the content with a spinner
    if (loading) {
        return (
            <main id="main-content" className="nhsuk-main-wrapper">
                <Container>
                    <Row>
                        <Col width="full">
                            {loadingMessage}
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
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container role="contentinfo">
                {/* Title Section */}
                <Row>
                    <Col width="two-thirds">
                        <h1 className='nhsuk-heading-xl'>
                            <span role="text" data-testid="eps_header_selectYourRole">
                                <span className="nhsuk-title">{title}</span>
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    {caption}
                                </span>
                            </span>
                        </h1>
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
                        <div className="section">
                            {rolesWithAccess.map((role: RolesWithAccessProps) => (
                                <EpsCard {...role} key={role.uuid} />
                            ))}
                        </div>
                    </Col>

                    {/* Roles without access Section */}
                    <Col width="two-thirds">
                        <h2>{rolesWithoutAccessHeader}</h2>
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
                                        {rolesWithoutAccess.map((role: RolesWithoutAccessProps) => (
                                            <Table.Row key={role.uuid}>
                                                <Table.Cell>
                                                    {role.orgName} (ODS: {role.odsCode})
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {role.roleName}
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
