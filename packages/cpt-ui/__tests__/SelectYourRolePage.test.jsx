import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Page from "../app/selectyourrole/page";
import EpsHeader from "../components/EpsHeader";
import React from "react";

// Mock `next/navigation` globally
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

import { usePathname } from "next/navigation";

describe("SelectYourRole Page", () => {
  it("renders a heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Select your role");
  });

  it("renders the caption", () => {
    render(<Page />);

    const caption = screen.getByText(/Select the role you wish to use to access the service/i);

    expect(caption).toBeInTheDocument();
  });

  it("renders the main container", () => {
    render(<Page />);

    const container = screen.getByRole("contentinfo");

    expect(container).toBeInTheDocument();
  });
});
