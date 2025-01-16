'use client'
import React from "react"

import {CHANGE_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/ChangeRolePageStrings"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"


export default function SelectYourRolePage() {
    return (
        <RoleSelectionPage contentText={CHANGE_YOUR_ROLE_PAGE_TEXT} />
    )
}
