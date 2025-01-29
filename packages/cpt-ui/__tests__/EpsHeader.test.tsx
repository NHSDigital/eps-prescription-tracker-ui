import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { useNavigate, useLocation } from "react-router-dom";
import React from "react";
import EpsHeader from "@/components/EpsHeader";
import { AuthContext } from "@/context/AuthProvider";
import { AccessContext } from "@/context/AccessProvider";

// Mock the strings module
jest.mock("@/constants/ui-strings/HeaderStrings", () => ({
  HEADER_SERVICE: "Clinical Prescription Tracker",
  HEADER_EXIT_BUTTON: "Exit",
  HEADER_EXIT_TARGET: "/exit",
  HEADER_CHANGE_ROLE_BUTTON: "Change role",
  HEADER_CHANGE_ROLE_TARGET: "/changerole",
  HEADER_SELECT_YOUR_ROLE_TARGET: "/selectyourrole",
  HEADER_SELECT_YOUR_ROLE_BUTTON: "Select your role",
}));

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(() => ({
    pathname: "/",
    search: "",
    hash: "",
    state: null,
  })),
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    [key: string]: any;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Default context values
const defaultAuthContext = {
  error: null,
  user: null,
  isSignedIn: false,
  idToken: null,
  accessToken: null,
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
};

const defaultAccessContext = {
  noAccess: false,
  singleAccess: false,
  selectedRole: "",
  userDetails: undefined,
  setUserDetails: jest.fn(),
  setNoAccess: jest.fn(),
  setSingleAccess: jest.fn(),
  setSelectedRole: jest.fn(),
  clear: jest.fn(),
};

const renderWithProviders = (
  pathname = "/",
  authOverrides = {},
  accessOverrides = {},
) => {
  (useLocation as jest.Mock).mockReturnValue({
    pathname,
    search: "",
    hash: "",
    state: null,
  });

  const authValue = { ...defaultAuthContext, ...authOverrides };
  const accessValue = { ...defaultAccessContext, ...accessOverrides };

  return render(
    <AuthContext.Provider value={authValue}>
      <AccessContext.Provider value={accessValue}>
        <EpsHeader />
      </AccessContext.Provider>
    </AuthContext.Provider>,
  );
};

describe("EpsHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("When the user is NOT signed in", () => {
    beforeEach(() => {
      renderWithProviders("/");
    });

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        "Clinical Prescription Tracker",
      );
    });

    it("does NOT display the 'Log out' link", () => {
      expect(screen.queryByTestId("eps_header_logout")).not.toBeInTheDocument();
    });

    it("does NOT display the 'Change role' link", () => {
      expect(
        screen.queryByTestId("eps_header_changeRoleLink"),
      ).not.toBeInTheDocument();
    });
  });

  describe("When the user IS signed in", () => {
    beforeEach(() => {
      renderWithProviders(
        "/",
        { isSignedIn: true },
        { selectedRole: "", singleAccess: false },
      );
    });

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        "Clinical Prescription Tracker",
      );
    });

    it("displays the 'Log out' link", () => {
      expect(screen.getByTestId("eps_header_logout")).toBeInTheDocument();
      expect(screen.getByTestId("eps_header_logout")).toHaveTextContent(
        "Log out",
      );
    });

    it("does NOT display an 'Exit' button by default", () => {
      expect(screen.queryByTestId("eps_header_exit")).not.toBeInTheDocument();
    });
  });

  describe("Select Your Role link behavior", () => {
    it("shows 'Select your role' when user is signed in, route !== /selectyourrole, and role not yet selected", () => {
      renderWithProviders(
        "/other-route",
        { isSignedIn: true },
        {
          selectedRole: "",
          singleAccess: false,
          noAccess: false,
        },
      );

      const link = screen.getByTestId("eps_header_selectYourRoleLink");
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("Select your role");
    });

    it("does NOT show 'Select your role' when the route is /selectyourrole", () => {
      renderWithProviders(
        "/selectyourrole",
        { isSignedIn: true },
        { selectedRole: "" },
      );

      expect(
        screen.queryByTestId("eps_header_selectYourRoleLink"),
      ).not.toBeInTheDocument();
    });
  });
});
