import React from 'react';
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import EpsHeader from "../components/EpsHeader";
import {
  HEADER_SERVICE,
  HEADER_CONFIRM_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_SELECT_YOUR_ROLE_BUTTON,
  HEADER_PRESCRIPTION_SEARCH_BUTTON
} from "../constants/ui-strings/HeaderStrings";

// Mock useRouter and usePathname:
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
    };
  },
  usePathname: jest.fn(),
}));

import { usePathname } from "next/navigation";

describe("EpsHeader", () => {
  describe("General Header Tests", () => {
    beforeEach(() => {
      usePathname.mockReturnValue("/"); // Default route for tests
      render(<EpsHeader />);
    });

    it("Successfully renders a header component, evidenced by role of 'banner'", () => {
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });

    it("Extracts HEADER_SERVICE value", () => {
      const serviceName = HEADER_SERVICE;
      expect(serviceName).toBeTruthy();
    });

    it("Displays service name in header matching that from HEADER_SERVICE data", () => {
      expect(screen.getByTestId("eps_header_serviceName")).toHaveTextContent(
        HEADER_SERVICE
      );
    });

    it("Extracts HEADER_CONFIRM_ROLE_BUTTON value", () => {
      const confirmRoleLink = HEADER_CONFIRM_ROLE_BUTTON;
      expect(confirmRoleLink).toBeTruthy();
    });

    it("Displays correct label for confirm role link from HEADER_CONFIRM_ROLE_BUTTON data", () => {
      expect(screen.getByTestId("eps_header_confirmRoleLink")).toHaveTextContent(
        HEADER_CONFIRM_ROLE_BUTTON
      );
    });

    it("Extracts HEADER_CHANGE_ROLE_BUTTON value", () => {
      const changeRoleLink = HEADER_CHANGE_ROLE_BUTTON;
      expect(changeRoleLink).toBeTruthy();
    });

    it("Check that change role link is not displayed ", () => {
      expect(screen.queryByTestId("eps_header_changeRoleLink")).toBeNull();
    });
  });

  describe("Select Your Role Functionality", () => {
    it("Displays 'Select Your Role' link when not on /selectyourrole", () => {
      usePathname.mockReturnValue("/some-other-route");
      render(<EpsHeader />);

      const selectYourRoleLink = screen.getByTestId("eps_header_selectYourRoleLink");
      expect(selectYourRoleLink).toBeInTheDocument();
      expect(selectYourRoleLink).toHaveTextContent(HEADER_SELECT_YOUR_ROLE_BUTTON);
    });

    it("Does not display 'Select Your Role' link when on /selectyourrole", () => {
      usePathname.mockReturnValue("/selectyourrole");
      render(<EpsHeader />);

      const selectYourRoleLink = screen.queryByTestId("eps_header_selectYourRoleLink");
      expect(selectYourRoleLink).toBeNull();

      const confirmRoleLink = screen.getByTestId("eps_header_confirmRoleLink");
      expect(confirmRoleLink).toBeInTheDocument();
      expect(confirmRoleLink).toHaveTextContent(HEADER_CONFIRM_ROLE_BUTTON);
    });

    it("Displays 'Confirm Role' link when on /selectyourrole", () => {
      usePathname.mockReturnValue("/selectyourrole");
      render(<EpsHeader />);

      const confirmRoleLink = screen.getByTestId("eps_header_confirmRoleLink");
      expect(confirmRoleLink).toBeInTheDocument();
      expect(confirmRoleLink).toHaveTextContent(HEADER_CONFIRM_ROLE_BUTTON);
    });
  });
});
