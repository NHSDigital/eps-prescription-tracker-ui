import React from "react"
import {CHANGE_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/ChangeRolePageStrings"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"
import {cptAwsRum} from "@/helpers/awsRum"

export default function ChangeRolePage() {
  cptAwsRum.recordPageView()

  return <RoleSelectionPage contentText={CHANGE_YOUR_ROLE_PAGE_TEXT} />
}
