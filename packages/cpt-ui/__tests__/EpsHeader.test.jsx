import React from 'react';
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import EpsHeader from "../components/EpsHeader";
import {
  HEADER_SERVICE
} from "../constants/ui-strings/HeaderStrings";

// Mock useRouter:
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null
    };
  },
  usePathname: () => "localhost:3000/",
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
});
