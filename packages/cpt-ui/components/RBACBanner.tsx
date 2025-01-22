"use client";
import React, { useEffect, useState } from "react";

import { Row } from "nhsuk-react-components";

import "@/assets/styles/rbacBanner.scss"
import { useAccess } from "@/context/AccessProvider";

export default function RBACBanner() {
    const [roleName, setRoleName] = useState<string | undefined>(undefined)
    const [orgName, setOrgName] = useState<string | undefined>(undefined)
    const [odsCode, setOdsCode] = useState<string | undefined>(undefined)

    const [lastName, setLastName] = useState<string | undefined>(undefined)
    const [firstName, setFirstName] = useState<string | undefined>(undefined)

    const { selectedRole, userDetails } = useAccess();

    useEffect(() => {
        if (!selectedRole) {
            return
        }
        setOrgName(selectedRole.org_name!)
        setOdsCode(selectedRole.org_code!)
        setRoleName(selectedRole.role_name!)
    }, [selectedRole])

    useEffect(() => {
        if (!userDetails) {
            return
        }
        setLastName(userDetails.family_name)
        setFirstName(userDetails.given_name)
    }, [userDetails])

    if (!selectedRole) {
        return (null)
    }

    return (
        <>
            {/* TODO: Is there a proper nhsuk component??? */}
            <div
                className="nhsuk-banner"
            >
                {/* TODO: What options are there for the role? */}
                <Row>
                    <p style={{ paddingLeft: "60px", margin: "8px" }}>
                        CONFIDENTIAL: PERSONAL PATIENT DATA accessed by {lastName}, {firstName} - {roleName} - {orgName} (ODS: {odsCode})
                    </p>
                </Row>
            </div>
        </>
    );
}
