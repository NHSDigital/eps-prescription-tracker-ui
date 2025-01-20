'use client'
import React, { useEffect, useState } from "react"

import { Container, Col, Row, Button, Table } from "nhsuk-react-components";
import Link from "next/link";
import { useRouter } from "next/navigation"

import { YOUR_SELECTED_ROLE_STRINGS } from "@/constants/ui-strings/YourSelectedRoleStrings"
import { useAccess } from "@/context/AccessProvider";

export default function YourSelectedRolePage() {
    const router = useRouter()
    const { selectedRole } = useAccess()

    const [roleName, setRoleName] = useState<string | undefined>(undefined)
    const [orgName, setOrgName] = useState<string | undefined>(undefined)
    const [odsCode, setOdsCode] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!selectedRole) {
            return
        }

        setRoleName(selectedRole.role_name)
        setOrgName(selectedRole.org_name)
        setOdsCode(selectedRole.org_code)
    }, [selectedRole])

    const handleRedirect = async (e: React.MouseEvent | React.KeyboardEvent) => {
        // Naked href don't respect the router, so this overrides that
        e.preventDefault();
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
    );
}
