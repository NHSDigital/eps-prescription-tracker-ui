import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SearchForAPrescription from "../app/searchforaprescription/page";
import React from "react";

import { HERO_TEXT } from "../constants/ui-strings/SearchForAPrescription";

describe("SearchForAPrescription", () => {
  it("renders the hero banner", () => {
    render(<SearchForAPrescription />);
    const heroBanner = screen.getByRole("heading", { name: /search for a prescription/i });
    expect(heroBanner).toBeInTheDocument();
  });
  
  

  it(`contains the text '${HERO_TEXT}'`, () => {
    render(<SearchForAPrescription />);
    const heroHeading = screen.getByRole("heading", { level: 1 });
    expect(heroHeading).toHaveTextContent(HERO_TEXT);
  });
});
