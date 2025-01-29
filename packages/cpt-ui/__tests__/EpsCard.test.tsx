import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import EpsCard from "@/components/EpsCard";
import { AuthContext } from "@/context/AuthProvider";
import { AccessContext } from "@/context/AccessProvider";

// Mock the auth configuration
jest.mock("@/context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: [
              "openid",
              "email",
              "phone",
              "profile",
              "aws.cognito.signin.user.admin",
            ],
            redirectSignIn: ["mockRedirectSignIn"],
            redirectSignOut: ["mockRedirectSignOut"],
            responseType: "code",
          },
          username: true,
          email: false,
          phone: false,
        },
      },
    },
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock EPS_CARD_STRINGS
jest.mock("@/constants/ui-strings/CardStrings", () => ({
  EPS_CARD_STRINGS: {
    noODSCode: "No ODS code",
    noOrgName: "NO ORG NAME",
    noRoleName: "No role name",
    noAddress: "Address not found",
  },
}));

jest.mock("@/config/environment", () => ({
  API_ENDPOINTS: { TRACKER_USER_INFO: "/mock-endpoint" },
  selectedRoleEndpoint: "/mock-endpoint/selected-role",
}));

const mockRole = {
  role_id: "123",
  org_name: "Test Organization",
  org_code: "XYZ123",
  role_name: "Pharmacist",
  site_address: "123 Test Street\nTest City",
};

const mockLink = "/role-detail";

// Default context values
const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: true,
  idToken: "mock-token",
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
};

const defaultAccessContext = {
  setSelectedRole: jest.fn(),
  noAccess: false,
  singleAccess: false,
  selectedRole: null,
  userDetails: undefined,
  setNoAccess: jest.fn(),
  setSingleAccess: jest.fn(),
  clear: jest.fn(),
};

const renderWithProviders = (
  props: { role: any; link: string },
  authOverrides = {},
  accessOverrides = {},
) => {
  const authValue = { ...defaultAuthContext, ...authOverrides };
  const accessValue = { ...defaultAccessContext, ...accessOverrides };

  return render(
    <AuthContext.Provider value={authValue}>
      <AccessContext.Provider value={accessValue}>
        <BrowserRouter>
          <EpsCard {...props} />
        </BrowserRouter>
      </AccessContext.Provider>
    </AuthContext.Provider>,
  );
};

describe("EpsCard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: "Success" }),
      }),
    );
  });

  it("renders role details correctly", () => {
    renderWithProviders({ role: mockRole, link: mockLink });

    expect(
      screen.getByText((content) => content.includes("Test Organization")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("ODS: XYZ123")),
    ).toBeInTheDocument();
    expect(screen.getByText("Pharmacist")).toBeInTheDocument();
    expect(screen.getByText("123 Test Street")).toBeInTheDocument();
    expect(screen.getByText("Test City")).toBeInTheDocument();
  });

  it("handles missing role data gracefully", () => {
    renderWithProviders({ role: {}, link: mockLink });

    expect(
      screen.getByText((content) => content.includes("NO ORG NAME")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("ODS: No ODS code")),
    ).toBeInTheDocument();
    expect(screen.getByText("No role name")).toBeInTheDocument();
    expect(screen.getByText("Address not found")).toBeInTheDocument();
  });

  it("calls API and navigates on card click", async () => {
    const mockSetSelectedRole = jest.fn();
    renderWithProviders(
      { role: mockRole, link: mockLink },
      {},
      { setSelectedRole: mockSetSelectedRole },
    );

    const cardLink = screen.getByRole("link", { name: /test organization/i });
    await fireEvent.click(cardLink);

    // Update the expect to match exactly what we expect
    expect(global.fetch).toHaveBeenCalledWith(
      "/mock-endpoint/selected-role", // Use the exact endpoint
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
          "NHSD-Session-URID": "555254242106",
        },
        body: JSON.stringify({
          currently_selected_role: {
            role_id: "123",
            org_name: "Test Organization",
            org_code: "XYZ123",
            role_name: "Pharmacist",
          },
        }),
      },
    );

    expect(mockSetSelectedRole).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: "123",
        org_name: "Test Organization",
        org_code: "XYZ123",
        role_name: "Pharmacist",
      }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(mockLink);
  });

  it("shows an alert when API call fails", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
      }),
    );
    const mockAlert = jest.spyOn(window, "alert").mockImplementation(() => {});

    renderWithProviders({ role: mockRole, link: mockLink });

    const cardLink = screen.getByRole("link", { name: /test organization/i });
    await fireEvent.click(cardLink);

    expect(mockAlert).toHaveBeenCalledWith(
      "There was an issue selecting your role. Please try again.",
    );

    mockAlert.mockRestore();
  });
});
