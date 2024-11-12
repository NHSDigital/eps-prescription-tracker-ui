import React from 'react';
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import EpsHeader from "../components/EpsHeader";
import {
  HEADER_SERVICE,
  HEADER_CONFIRM_ROLE_BUTTON,
  HEADER_CONFIRM_ROLE_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET
} from "../constants/ui-strings/HeaderStrings";

// Mock useRouter:
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null
    };
  },
  usePathname: () => "/",
}));
describe("EpsHeader", () => {
  beforeEach(() => {
    render(<EpsHeader />);    
  })
  it("Successfully renders a header component, evidenced by role of 'banner", () => {
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
  // check behavior of links in header
  // confirm role link
  it("Extracts HEADER_CONFIRM_ROLE_BUTTON value", () => {
    const confirmRoleLink = HEADER_CONFIRM_ROLE_BUTTON;
    expect(confirmRoleLink).toBeTruthy();
  });
  it("Displays correct label for confirm role link from HEADER_CONFIRM_ROLE_BUTTON data", () => {
    expect(screen.getByTestId("eps_header_confirmRoleLink")).toHaveTextContent(
      HEADER_CONFIRM_ROLE_BUTTON
    );
  });
  // change role link -- test will be more specific as routes are added
  it("Extracts HEADER_CHANGE_ROLE_BUTTON value", () => {
    const changeRoleLink = HEADER_CHANGE_ROLE_BUTTON;
    expect(changeRoleLink).toBeTruthy();
  });
  it("Check that change role link is not displayed ", () => {
    expect(screen.queryByTestId("eps_header_changeRoleLink")).toBeNull();
  });
});
