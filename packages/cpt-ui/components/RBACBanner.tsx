"use client"
import React, {useEffect, useState} from "react"

import {Row} from "nhsuk-react-components"

import "@/assets/styles/rbacBanner.scss"
import {RBAC_BANNER_STRINGS} from "@/constants/ui-strings/RBACBannerStrings"
import {useAccess} from "@/context/AccessProvider"

export default function RBACBanner() {
    const [bannerText, setBannerText] = useState<string>("")
    const {selectedRole, userDetails} = useAccess()

    useEffect(() => {
        if (!selectedRole || !userDetails) {
            console.log("No selected role or user details - hiding RBAC banner.")
            setBannerText("")
            return
        }

        /**
         * The RBAC (Role-Based Access Control) User Profile Banner follows these patterns:
         *
         * Standard User:
         * CONFIDENTIAL: PERSONAL PATIENT DATA accessed by LAST NAME, First Name - RBAC Role - Site Name (ODS: ODS)
         *
         * Locum User (org_code === 'FFFFF'):
         * CONFIDENTIAL: PERSONAL PATIENT DATA accessed by LAST NAME, First Name - RBAC Role - Locum pharmacy (ODS: FFFFF) - Site Name (ODS: ODS Code)
         */

        // Determine the organization name (use "Locum pharmacy" for locum users)
        const orgName = selectedRole.org_code === "FFFFF"
            ? RBAC_BANNER_STRINGS.LOCUM_NAME
            : selectedRole.org_name || RBAC_BANNER_STRINGS.NO_ORG_NAME

        // Format the last name in uppercase, and capitalize the first letter of the first name
        const lastName = userDetails.family_name?.toUpperCase() || RBAC_BANNER_STRINGS.NO_FAMILY_NAME
        const firstName = userDetails.given_name
            ? userDetails.given_name.charAt(0).toUpperCase() + userDetails.given_name.slice(1).toLowerCase()
            : RBAC_BANNER_STRINGS.NO_GIVEN_NAME

        // Construct the final banner text using template replacement
        setBannerText(
            RBAC_BANNER_STRINGS.CONFIDENTIAL_DATA
                .replace("{lastName}", lastName)
                .replace("{firstName}", firstName)
                .replace("{roleName}", selectedRole.role_name || RBAC_BANNER_STRINGS.NO_ROLE_NAME)
                .replace("{orgName}", orgName)
                .replace("{odsCode}", selectedRole.org_code || RBAC_BANNER_STRINGS.NO_ODS_CODE)
        )
    }, [selectedRole, userDetails])

    /**
    * Hide the banner if the user session is missing or incomplete.
    * The component should render only after a role is selected.
    * This check must come after the effect logic to prevent hydration errors in SSR.
    */
    if (!selectedRole || !userDetails || !bannerText) {
        return null
    }

    return (
        <div className="nhsuk-banner" data-testid="rbac-banner-div">
            <Row>
                <p style={{paddingLeft: "60px", margin: "8px"}} data-testid="rbac-banner-text">
                    {bannerText}
                </p>
            </Row>
        </div>
    )
}
