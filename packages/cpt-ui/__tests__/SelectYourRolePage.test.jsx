import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SelectYourRolePage from "../app/selectyourrole/page";
import React from "react";

// Mock `next/navigation` globally
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import { usePathname } from "next/navigation";

describe("SelectYourRole Page", () => {
  it("renders a heading", () => {
    render(<SelectYourRolePage />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Select your role");
  });

  it("renders the caption", () => {
    render(<SelectYourRolePage />);

    const caption = screen.getByText(/Select the role you wish to use to access the service/i);

    expect(caption).toBeInTheDocument();
  });

  it("renders the main container", () => {
    render(<SelectYourRolePage />);

    const container = screen.getByRole("contentinfo");

    expect(container).toBeInTheDocument();
  });
});
