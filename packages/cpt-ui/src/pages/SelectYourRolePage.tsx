import React from "react"
import {SELECT_YOUR_ROLE_PAGE_TEXT} from "@/constants/ui-strings/CardStrings"
import RoleSelectionPage from "@/components/EpsRoleSelectionPage"
import {cptAwsRum} from "@/helpers/awsRum"

export default function SelectYourRolePage() {
  cptAwsRum.recordPageView()

  return <RoleSelectionPage contentText={SELECT_YOUR_ROLE_PAGE_TEXT} />
}
