import React from "react"
import {CHANGE_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/ChangeRolePageStrings"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"

export default function ChangeRolePage() {
  return <RoleSelectionPage contentText={CHANGE_YOUR_ROLE_PAGE_TEXT} />
}
