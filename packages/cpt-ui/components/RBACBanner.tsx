"use client";
import React, { useEffect, useState } from "react";

import { Row } from "nhsuk-react-components";

import "@/assets/styles/rbacBanner.scss"
import { RBAC_BANNER_STRINGS } from "@/constants/ui-strings/RBACBannerStrings";
import { useAccess } from "@/context/AccessProvider";

export default function RBACBanner() {
    const [bannerText, setBannerText] = useState<string>("")

    const { selectedRole, userDetails } = useAccess();

    useEffect(() => {
        let orgName
        if (selectedRole) {
            // Locums have a specific ODS code, and need to be shouted out
            if (selectedRole.org_code === "FFFFF") {
                orgName = RBAC_BANNER_STRINGS.LOCUM_NAME
            } else if (selectedRole.org_name) {
                orgName = selectedRole.org_name
            }
        }

        setBannerText(RBAC_BANNER_STRINGS.CONFIDENTIAL_DATA
            .replace("{lastName}", userDetails?.family_name ?? RBAC_BANNER_STRINGS.NO_FAMILY_NAME)
            .replace("{firstName}", userDetails?.given_name ?? RBAC_BANNER_STRINGS.NO_GIVEN_NAME)
            .replace("{roleName}", selectedRole?.role_name ?? RBAC_BANNER_STRINGS.NO_ROLE_NAME)
            .replace("{orgName}", orgName ?? RBAC_BANNER_STRINGS.NO_ORG_NAME)
            .replace("{odsCode}", selectedRole?.org_code ?? RBAC_BANNER_STRINGS.NO_ODS_CODE)
        )
    }, [
        selectedRole,
        userDetails
    ])

    // Render only after the user selects a role.
    // This has to come after all the logic, or we get a hydration error!
    if (!selectedRole) {
        return (null)
    }

    return (
        <>
            {/* I can't find a component for a banner, so I've cribbed the CSS from the prototype here. */}
            <div
                className="nhsuk-banner"
                data-testid="rbac-banner-div"
            >
                <Row>
                    <p
                        style={{ paddingLeft: "60px", margin: "8px" }}
                        data-testid="rbac-banner-text"
                    >
                        {bannerText}
                    </p>
                </Row>
            </div>
        </>
    );
}
