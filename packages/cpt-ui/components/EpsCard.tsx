'use client'
import React, {useContext} from "react"
import {Card, Col, Row} from "nhsuk-react-components"
import "@/assets/styles/card.scss"

import {AuthContext} from "@/context/AuthProvider"
import {useAccess} from '@/context/AccessProvider'
import {useRouter} from "next/navigation"
import {RoleDetails} from "@/types/TrackerUserInfoTypes"

import {EPS_CARD_STRINGS} from "@/constants/ui-strings/CardStrings"

const selectedRoleEndpoint = "/api/selected-role"

export interface EpsCardProps {
    role: RoleDetails
    link: string
}

export default function EpsCard({role, link}: EpsCardProps) {
    const router = useRouter()
    const auth = useContext(AuthContext)
    const {setSelectedRole} = useAccess()

    const handleSetSelectedRole = async (e: React.MouseEvent) => {
        e.preventDefault()

        try {
            // Define currentlySelectedRole before sending the request
            const currentlySelectedRole: RoleDetails = {
                role_id: role.role_id || "",
                org_name: role.org_name || "",
                org_code: role.org_code || "",
                role_name: role.role_name || ""
            }

            // Update selected role in the backend via the selectedRoleLambda endpoint
            const response = await fetch(selectedRoleEndpoint, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${auth?.idToken}`,
                    'Content-Type': 'application/json',
                    'NHSD-Session-URID': '555254242106',
                    'Role-ID': role.role_id || ""
                },
                body: JSON.stringify({
                    currently_selected_role: currentlySelectedRole
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to update the selected role')
            }

            // Update frontend state with selected role
            setSelectedRole(currentlySelectedRole)

            // Redirect to the appropriate page
            router.push(link)
        } catch (error) {
            console.error('Error selecting role:', error)
            alert("There was an issue selecting your role. Please try again.")
        }
    }

    const {
        noODSCode,
        noOrgName,
        noRoleName,
        noAddress
    } = EPS_CARD_STRINGS

    return (
        <Card clickable className="eps-card">
            <Card.Content>
                <Row className="nhsuk-grid-row eps-card__content">

                    <Col width='one-half'>
                        <Card.Link
                            href={link}
                            onClick={handleSetSelectedRole}
                        >
                            <Card.Heading className="nhsuk-heading-s">
                                {role.org_name || noOrgName}
                                <br />
                                (ODS: {role.org_code || noODSCode})
                            </Card.Heading>
                        </Card.Link>
                        <Card.Description className="eps-card__roleName">
                            {role.role_name || noRoleName}
                        </Card.Description>
                    </Col>

                    <Col width='one-half'>
                        <Card.Description className="eps-card__siteAddress">
                            {(role.site_address || noAddress)
                                .split("\n")
                                .map((line: string, index: number) => (
                                    <span
                                        key={index}
                                        className="eps-card__siteAddress-line"
                                    >
                                        {line}
                                        <br />
                                    </span>
                                ))}
                        </Card.Description>
                    </Col>
                </Row>
            </Card.Content>
        </Card>
    )
}
