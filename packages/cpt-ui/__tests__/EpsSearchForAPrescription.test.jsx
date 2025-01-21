import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import React from "react";

import SearchForAPrescription from "@/app/searchforaprescription/page";

import { HERO_TEXT } from "@/constants/ui-strings/SearchForAPrescriptionStrings";

describe("SearchForAPrescription", () => {
  it("renders the hero banner", () => {
    render(<SearchForAPrescription />);
    const heroBanner = screen.getByRole("heading", { name: /Search for a prescription/i });
    expect(heroBanner).toBeInTheDocument();
  });

  it(`contains the text '${HERO_TEXT}'`, () => {
    render(<SearchForAPrescription />);
    const heroHeading = screen.getByRole("heading", { name: /Search for a prescription/i });
    expect(heroHeading).toHaveTextContent(HERO_TEXT);
  });
});
