import React from "react";
import { SELECT_YOUR_ROLE_PAGE_TEXT } from "@/constants/ui-strings/CardStrings";
import RoleSelectionPage from "@/components/EpsRoleSelectionPage";

export default function SelectYourRolePage() {
  return <RoleSelectionPage contentText={SELECT_YOUR_ROLE_PAGE_TEXT} />;
}
