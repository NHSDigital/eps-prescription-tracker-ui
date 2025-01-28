'use client'
import React, {useEffect, useState} from "react"

import {Container, Col, Row, Button, Table} from "nhsuk-react-components"
import Link from "next/link"
import {useRouter} from "next/navigation"

import {YOUR_SELECTED_ROLE_STRINGS} from "@/constants/ui-strings/YourSelectedRoleStrings"
import {useAccess} from "@/context/AccessProvider"

export default function YourSelectedRolePage() {
    const router = useRouter()
    const {selectedRole} = useAccess()

    const [roleName, setRoleName] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
    const [orgName, setOrgName] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noOrgName)
    const [odsCode, setOdsCode] = useState<string>(YOUR_SELECTED_ROLE_STRINGS.noODSCode)

    useEffect(() => {
        if (!selectedRole) {
            // Set fallback values if selectedRole is undefined
            setRoleName(YOUR_SELECTED_ROLE_STRINGS.noRoleName)
            setOrgName(YOUR_SELECTED_ROLE_STRINGS.noOrgName)
            setOdsCode(YOUR_SELECTED_ROLE_STRINGS.noODSCode)
            return
        }

        setRoleName(selectedRole.role_name || YOUR_SELECTED_ROLE_STRINGS.noRoleName)
        setOrgName(selectedRole.org_name || YOUR_SELECTED_ROLE_STRINGS.noOrgName)
        setOdsCode(selectedRole.org_code || YOUR_SELECTED_ROLE_STRINGS.noODSCode)
    }, [selectedRole])

    const handleRedirect = async (e: React.MouseEvent | React.KeyboardEvent) => {
        // Naked href don't respect the router, so this overrides that
        e.preventDefault()
        router.push("/searchforaprescription")
    }

    const {
        heading,
        subheading,
        tableTitle,
        roleLabel,
        orgLabel,
        changeLinkText,
        confirmButtonText
    } = YOUR_SELECTED_ROLE_STRINGS

    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Col width="full">
                        <h1 className="nhsuk-heading-xl">
                            <span role="text" data-testid="eps_header_yourSelectedRole">
                                <span className="nhsuk-title">
                                    {heading}
                                </span>
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    {subheading}
                                </span>
                            </span>
                        </h1>
                    </Col>

                    {/* Roles without access Section */}
                    <Col width="two-thirds">
                        <h2>{tableTitle}</h2>
                        <Table>
                            <Table.Body>
                                <Table.Row key="role-row">
                                    <Table.Cell data-testid="role-label">
                                        <b>{roleLabel}</b>
                                    </Table.Cell>
                                    <Table.Cell data-testid="role-text">
                                        {roleName}
                                    </Table.Cell>
                                    <Table.Cell data-testid="role-change-role-cell">
                                        <Link
                                            href="/changerole"
                                            passHref={true}
                                        >
                                            {changeLinkText}
                                        </Link>
                                    </Table.Cell>
                                </Table.Row>
                                <Table.Row key="org-row">
                                    <Table.Cell data-testid="org-label">
                                        <b>{orgLabel}</b>
                                    </Table.Cell>
                                    <Table.Cell data-testid="org-text">
                                        {orgName} (ODS: {odsCode})
                                    </Table.Cell>
                                    <Table.Cell data-testid="org-change-role-cell">
                                        <Link
                                            href="/changerole"
                                            passHref={true}
                                        >
                                            {changeLinkText}
                                        </Link>
                                    </Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                    </Col>
                </Row>

                <Row>
                    <Col width="two-thirds">
                        <Button
                            onClick={handleRedirect}
                            data-testid="confirm-and-continue"
                        >
                            {confirmButtonText}
                        </Button>
                    </Col>
                </Row>
            </Container>
        </main>
    )
}
