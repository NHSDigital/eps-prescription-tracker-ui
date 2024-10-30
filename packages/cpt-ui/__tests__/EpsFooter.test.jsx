import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import EpsFooter from "../components/EpsFooter";
import {
    FOOTER_COPYRIGHT
} from "../constants/ui-strings/FooterStrings";

describe("EpsFooter", () => {
  it("Successfully renders a footer component, evidenced by role of 'contentinfo", () => {
    render(<EpsFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });
  it("Extracts FOOTER_COPYRIGHT value", () => {
    render(<EpsFooter />);
    const copyright = FOOTER_COPYRIGHT;
    expect(copyright).toBeTruthy();
  });
  it("Displays copyright message matching that from FOOTER_COPYRIGHT data", () => {
    render(<EpsFooter />);
    expect(screen.getByTestId("eps_footer-copyright")).toHaveTextContent(
        FOOTER_COPYRIGHT
    );
  });
});
