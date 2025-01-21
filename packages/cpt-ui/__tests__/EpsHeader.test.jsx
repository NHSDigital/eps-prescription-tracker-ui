import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import EpsHeader from "@/components/EpsHeader";
import {
  HEADER_SERVICE,
  HEADER_SELECT_YOUR_ROLE_BUTTON,
} from "@/constants/ui-strings/HeaderStrings";

// Mocks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ prefetch: () => null })),
  usePathname: jest.fn(),
}));

import { AuthContext } from "@/context/AuthProvider";
import { AccessProvider } from "@/context/AccessProvider";

// Example constants
import {
  HEADER_SERVICE,
  HEADER_SELECT_YOUR_ROLE_BUTTON
} from "@/constants/ui-strings/HeaderStrings";

function MockAuthProvider({
  isSignedIn,
  children
}) {
  return (
    <AuthContext.Provider value={{ isSignedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

describe("EpsHeader", () => {
  beforeEach(() => {
    // Default route for all tests unless overridden
    (usePathname).mockReturnValue("/");
  });

  describe("When the user is NOT signed in", () => {
    beforeEach(() => {
      render(
        <MockAuthProvider isSignedIn={false}>
          <AccessProvider>
            <EpsHeader />
          </AccessProvider>
        </MockAuthProvider>
      );
    });

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        HEADER_SERVICE
      );
    });

    it("does NOT display the 'Log out' link", () => {
      expect(screen.queryByTestId("eps_header_logout")).toBeNull();
    });

    it("does NOT display the 'Change role' link", () => {
      // Because user isn't signed in
      expect(screen.queryByTestId("eps_header_changeRoleLink")).toBeNull();
    });
  });

  describe("When the user IS signed in", () => {
    beforeEach(() => {
      render(
        <MockAuthProvider isSignedIn={true}>
          <AccessProvider>
            <EpsHeader />
          </AccessProvider>
        </MockAuthProvider>
      );
    });

    it("renders the header (role='banner')", () => {
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("displays the correct service name in the header", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        HEADER_SERVICE
      );
    });

    it("displays the 'Log out' link", () => {
      expect(screen.getByTestId("eps_header_logout")).toBeInTheDocument();
      expect(screen.getByTestId("eps_header_logout")).toHaveTextContent("Log out");
    });

    it("does NOT display an 'Exit' button by default", () => {
      expect(screen.queryByTestId("eps_header_exit")).toBeNull();
    });
  });

  describe("Select Your Role link behavior", () => {
    it("shows 'Select your role' when user is signed in, route !== /selectyourrole, and role not yet selected", () => {
      (usePathname).mockReturnValue("/other-route");
      render(
        <MockAuthProvider isSignedIn={true}>
          <AccessProvider>
            <EpsHeader />
          </AccessProvider>
        </MockAuthProvider>
      );

      const selectYourRoleLink = screen.getByTestId("eps_header_selectYourRoleLink");
      expect(selectYourRoleLink).toBeInTheDocument();
      expect(selectYourRoleLink).toHaveTextContent(HEADER_SELECT_YOUR_ROLE_BUTTON);
    });

    it("does NOT show 'Select your role' when the route is /selectyourrole", () => {
      (usePathname).mockReturnValue("/selectyourrole");
      render(
        <MockAuthProvider isSignedIn={true}>
          <AccessProvider>
            <EpsHeader />
          </AccessProvider>
        </MockAuthProvider>
      );

      expect(screen.queryByTestId("eps_header_selectYourRoleLink")).toBeNull();
    });
  });
});
