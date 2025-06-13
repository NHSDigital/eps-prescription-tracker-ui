import React from "react"
import {render, screen} from "@testing-library/react"
import RBACBanner from "@/components/RBACBanner"
import {useAuth} from "@/context/AuthProvider"

// Mock the useAuth hook
jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn()
}))

const mockUseAuth = useAuth as jest.Mock

// Constants from your RBAC_BANNER_STRINGS for easy reference in tests
const RBAC_BANNER_STRINGS = {
  CONFIDENTIAL_DATA:
    "CONFIDENTIAL: PERSONAL PATIENT DATA accessed by {lastName}, {firstName} - {roleName} - {orgName} (ODS: {odsCode})",
  LOCUM_NAME: "Locum pharmacy",
  NO_ORG_NAME: "NO_ORG_NAME",
  NO_FAMILY_NAME: "NO_FAMILY_NAME",
  NO_GIVEN_NAME: "NO_GIVEN_NAME",
  NO_ROLE_NAME: "NO_ROLE_NAME",
  NO_ODS_CODE: "NO_ODS_CODE"
}

describe("RBACBanner", () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it("should render with the correct text when selectedRole and userDetails are set", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: {
        org_code: "X12345",
        org_name: "Some Org",
        role_name: "Pharmacist"
      },
      userDetails: {
        family_name: "Doe",
        given_name: "John"
      }
    })

    render(<RBACBanner />)

    expect(screen.getByTestId("rbac-banner-text")).toHaveTextContent(
      "CONFIDENTIAL: PERSONAL PATIENT DATA accessed by DOE, John - Pharmacist - Some Org (ODS: X12345)"
    )
  })

  it("should use LOCUM_NAME if org_code is FFFFF", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: {
        org_code: "FFFFF",
        org_name: "Ignored Org Name",
        role_name: "Locum Pharmacist"
      },
      userDetails: {
        family_name: "Smith",
        given_name: "Anna"
      }
    })

    render(<RBACBanner />)

    expect(screen.getByTestId("rbac-banner-text")).toHaveTextContent(
      // eslint-disable-next-line max-len
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by SMITH, Anna - Locum Pharmacist - ${RBAC_BANNER_STRINGS.LOCUM_NAME} (ODS: FFFFF)`
    )
  })

  it("should handle missing userDetails fields", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: {
        org_code: "X99999",
        org_name: "Some Org",
        role_name: "Nurse"
      },
      userDetails: {
        // missing family_name and given_name
      }
    })

    render(<RBACBanner />)

    expect(screen.getByTestId("rbac-banner-text")).toHaveTextContent(
      // eslint-disable-next-line max-len
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by ${RBAC_BANNER_STRINGS.NO_FAMILY_NAME}, ${RBAC_BANNER_STRINGS.NO_GIVEN_NAME} - Nurse - Some Org (ODS: X99999)`
    )
  })

  it("should handle missing selectedRole fields", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: {
        // missing org_code, org_name, role_name
      },
      userDetails: {
        family_name: "Brown",
        given_name: "Charlie"
      }
    })

    render(<RBACBanner />)

    expect(screen.getByTestId("rbac-banner-text")).toHaveTextContent(
      // eslint-disable-next-line max-len
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by BROWN, Charlie - ${RBAC_BANNER_STRINGS.NO_ROLE_NAME} - ${RBAC_BANNER_STRINGS.NO_ORG_NAME} (ODS: ${RBAC_BANNER_STRINGS.NO_ODS_CODE})`
    )
  })

  it("should fallback to NO_ORG_NAME if org_name is missing", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: {
        org_code: "X55555",
        // missing org_name
        role_name: "Technician"
      },
      userDetails: {
        family_name: "Green",
        given_name: "Emma"
      }
    })

    render(<RBACBanner />)

    expect(screen.getByTestId("rbac-banner-text")).toHaveTextContent(
      // eslint-disable-next-line max-len
      `CONFIDENTIAL: PERSONAL PATIENT DATA accessed by GREEN, Emma - Technician - ${RBAC_BANNER_STRINGS.NO_ORG_NAME} (ODS: X55555)`
    )
  })

  it("should render null (nothing) when selectedRole is missing", () => {
    mockUseAuth.mockReturnValue({
      selectedRole: null,
      userDetails: {
        family_name: "Green",
        given_name: "Emma"
      }
    })

    const {container} = render(<RBACBanner />)
    expect(container.firstChild).toBeNull()
  })
})
