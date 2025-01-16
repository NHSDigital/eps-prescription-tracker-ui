'use client'
import React from "react"

import { Container, Col, Row, Button, Table } from "nhsuk-react-components";
import Link from "next/link";
import { useRouter } from "next/navigation"

export default function YourSelectedRolePage() {
    const router = useRouter()

    const roleName = "Health professional access role"
    const orgName = "COHEN'S CHEMIST"
    const odsCode = "FV519"

    const handleRedirect = async (e: React.MouseEvent | React.KeyboardEvent) => {
        // Naked href don't respect the router, so this overrides that
        e.preventDefault();
        router.push("/searchforaprescription")
    }

    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Col width="full">
                        <h1 className="nhsuk-heading-xl">
                            <span role="text" data-testid="eps_header_selectYourRole">
                                <span className="nhsuk-title">
                                    Your selected role
                                </span>
                                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                    <span className="nhsuk-u-visually-hidden"> - </span>
                                    The following role is now active
                                </span>
                            </span>
                        </h1>
                    </Col>

                    {/* Roles without access Section */}
                    <Col width="two-thirds">
                        <h2>Current role details</h2>
                        <Table>
                            <Table.Body>
                                <Table.Row key="role-row">
                                    <Table.Cell data-testid="role-label">
                                        <b>Role</b>
                                    </Table.Cell>
                                    <Table.Cell data-testid="role-text">
                                        {roleName}
                                    </Table.Cell>
                                    <Table.Cell data-testid="change-role-cell">
                                        <Link
                                            href="/changerole"
                                            passHref={true}
                                        >
                                            Change
                                        </Link>
                                    </Table.Cell>
                                </Table.Row>
                                <Table.Row key="org-row">
                                    <Table.Cell data-testid="org-label">
                                        <b>Organisation</b>
                                    </Table.Cell>
                                    <Table.Cell data-testid="org-text">
                                        {orgName} (ODS: {odsCode})
                                    </Table.Cell>
                                    <Table.Cell data-testid="change-role-cell">
                                        <Link
                                            href="/changerole"
                                            passHref={true}
                                        >
                                            Change
                                        </Link>
                                    </Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                    </Col>
                </Row>

                <Row>
                    <Col width="two-thirds">
                        <Button onClick={handleRedirect}>
                            Confirm and continue to find a prescription
                        </Button>
                    </Col>
                </Row>
            </Container>
        </main>
    );
}
