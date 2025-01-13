'use client'
import React, {useState, useEffect, useContext, useCallback} from "react"
import {Container, Col, Row, Details, Table, ErrorSummary, InsetText} from "nhsuk-react-components"

import {AuthContext} from "@/context/AuthProvider"
import {useAccess} from '@/context/AccessProvider'

import EpsCard, {EpsCardProps} from "@/components/EpsCard"
import EpsSpinner from "@/components/EpsSpinner"

import {ChangeRolePageStrings} from "@/constants/ui-strings/ChangeRolePageStrings"
import {SelectYourRolePageStrings} from "@/constants/ui-strings/SelectYourRolePageStrings"

export type RoleDetails = {
  role_name?: string
  role_id?: string
  org_code?: string
  org_name?: string
  site_name?: string
  site_address?: string
  uuid?: string
}

export type TrackerUserInfo = {
  roles_with_access: Array<RoleDetails>
  roles_without_access: Array<RoleDetails>
  currently_selected_role?: RoleDetails
}

// Extends the EpsCardProps to include a unique identifier
export type RolesWithAccessProps = EpsCardProps & {
  uuid: string
}

export type RolesWithoutAccessProps = {
  uuid: string
  orgName: string
  odsCode: string
  roleName: string
}

const trackerUserInfoEndpoint = "/api/tracker-user-info"

const {
  title,
  caption,
  returnLinkText,
  returnLinkHref,
  returnMessage,
  rolesWithAccessTitle,
  showingRolesText,
} = ChangeRolePageStrings

const {
  loginInfoText,
  organisation,
  role,
  roles_without_access_table_title,
  noOrgName,
  rolesWithoutAccessHeader,
  noODSCode,
  noRoleName,
  noAddress,
  errorDuringRoleSelection
} = SelectYourRolePageStrings

export default function ChangeYourRolePage() {
  const {setNoAccess} = useAccess()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [rolesWithAccess, setRolesWithAccess] = useState<RolesWithAccessProps[]>([])
  const [rolesWithoutAccess, setRolesWithoutAccess] = useState<RolesWithoutAccessProps[]>([])
  const [currentlySelectedRole, setCurrentlySelectedRole] = useState<RoleDetails | undefined>(undefined)

  const auth = useContext(AuthContext)

  const fetchTrackerUserInfo = useCallback(async () => {
    setLoading(true)
    setError(null)
    setRolesWithAccess([])
    setCurrentlySelectedRole(undefined)

    if (!auth?.isSignedIn || !auth) {
      setLoading(false)
      setError(null)
      return
    }

    try {
      const response = await fetch(trackerUserInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${auth?.idToken}`,
          'NHSD-Session-URID': '555254242106'
        }
      })

      if (response.status !== 200) {
        throw new Error(`Server did not return CPT user info, response ${response.status}`)
      }

      const data = await response.json()

      if (!data.userInfo) {
        throw new Error("Server response did not contain data")
      }

      const userInfo: TrackerUserInfo = data.userInfo

      const rolesWithAccess = userInfo.roles_with_access
      const rolesWithoutAccess = userInfo.roles_without_access
      const currentlySelectedRole = userInfo.currently_selected_role ? {
        ...userInfo.currently_selected_role,
        uuid: `selected_role_0`
      } : undefined

      // Populate the EPS card props
      setRolesWithAccess(
        rolesWithAccess.map((role: RoleDetails, index: number) => ({
          uuid: `{role_with_access_${index}}`,
          orgName: role.org_name ? role.org_name : noOrgName,
          odsCode: role.org_code ? role.org_code : noODSCode,
          siteAddress: role.site_address ? role.site_address : noAddress,
          roleName: role.role_name ? role.role_name : noRoleName,
          link: "roles-confirm?roleType=" + encodeURIComponent(role.role_name || "")
        }))
      )

      setRolesWithoutAccess(
        rolesWithoutAccess.map((role: RoleDetails, index: number) => ({
          uuid: `{role_without_access_${index}}`,
          roleName: role.role_name ? role.role_name : noRoleName,
          orgName: role.org_name ? role.org_name : noOrgName,
          odsCode: role.org_code ? role.org_code : noODSCode
        }))
      )

      setCurrentlySelectedRole(currentlySelectedRole)
      setNoAccess(rolesWithAccess.length === 0)

    } catch (err) {
      setError("Failed to fetch CPT user info")
      console.error("error fetching tracker user info:", err)
    } finally {
      setLoading(false)
    }

  }, [auth, setNoAccess])

  useEffect(() => {
    if (auth?.isSignedIn === undefined) {
      return
    }

    if (auth?.isSignedIn) {
      fetchTrackerUserInfo()
    }
  }, [auth?.isSignedIn, fetchTrackerUserInfo])

  useEffect(() => {
    console.log("Auth error updated:", auth?.error)
    // Have to do this to make `<string | null | undefined>` work with `<string | null>`
    setError(auth?.error ?? null)
    if (auth?.error) {
      setLoading(false)
    }
  }, [auth?.error])

  // If the data is being fetched, replace the content with a spinner
  if (loading) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <Col width="full">
              <EpsSpinner />
            </Col>
          </Row>
        </Container>
      </main>
    )
  }

  // If the process encounters an error, replace the content with an error summary
  if (error) {
    return (
      <main id="main-content" className="nhsuk-main-wrapper">
        <Container>
          <Row>
            <ErrorSummary>
              <ErrorSummary.Title>
                {errorDuringRoleSelection}
              </ErrorSummary.Title>
              <ErrorSummary.List>
                <ErrorSummary.Item href="PLACEHOLDER/contact/us">
                  {error}
                </ErrorSummary.Item>
              </ErrorSummary.List>
            </ErrorSummary>
          </Row>
        </Container>
      </main>
    )
  }

  const loginInfoMessage = currentlySelectedRole
    ? loginInfoText.message(currentlySelectedRole.org_name || noOrgName, currentlySelectedRole.org_code || noODSCode, currentlySelectedRole.role_name || noRoleName)
    : ""

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container role="contentinfo">
        {/* Title Section */}
        <Row>
          <Col width="full">
            <h1 className="select-role-header nhsuk-heading-xl">
              {title}
              <span className="nhsuk-caption-xl nhsuk-caption--bottom">
                {caption}
              </span>
            </h1>

            {/* Inset Text Section */}
            <InsetText className="current-role">
              <span className="nhsuk-u-visually-hidden">{loginInfoText.visuallyHidden}</span>
              <p id="current-role-details" dangerouslySetInnerHTML={{__html: loginInfoMessage}}></p>
            </InsetText>
            <p>{returnMessage} <a href={returnLinkHref}>{returnLinkText}</a></p>
          </Col>

          {/* Roles with access Section */}
          <Col width="full">
            <h2 className="allowed-role-title">{rolesWithAccessTitle}</h2>
            <div className="section" >
              {rolesWithAccess.map((role: RolesWithAccessProps) => (
                <EpsCard {...role} key={role.uuid} />
              ))}
            </div>
            <p className="rows-displayed-count"><b>{showingRolesText(rolesWithAccess.length)}</b></p>
          </Col>

          {/* Roles without access Section */}
          <Col width="two-thirds">
            <h3>{rolesWithoutAccessHeader}</h3>
            <Details expander>
              <Details.Summary>
                {roles_without_access_table_title}
              </Details.Summary>
              <Details.Text>
                <Table>
                  <Table.Head>
                    <Table.Row>
                      <Table.Cell>{organisation}</Table.Cell>
                      <Table.Cell>{role}</Table.Cell>
                    </Table.Row>
                  </Table.Head>
                  <Table.Body>
                    {rolesWithoutAccess.map((role: RolesWithoutAccessProps) => (
                      <Table.Row key={role.uuid}>
                        <Table.Cell>
                          {role.orgName} (ODS: {role.odsCode})
                        </Table.Cell>
                        <Table.Cell>
                          {role.roleName}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Details.Text>
            </Details>
          </Col>
        </Row>
      </Container>
    </main>
  )
}
