import "@testing-library/jest-dom"
import {render, screen} from "@testing-library/react"
import EpsFooter from "@/components/EpsFooter"

jest.mock("@/constants/ui-strings/FooterStrings", () => ({
  FOOTER_COPYRIGHT: "© NHS England",
  FOOTER_LINKS: [
    {
      text: "Privacy notice (opens in new tab)",
      href: "https://example.com/privacy",
      external: true
    },
    {
      text: "Terms and conditions",
      href: "terms-and-conditions",
      external: false
    },
    {
      text: "Cookie policy",
      href: "cookies",
      external: false
    }
  ]
}))

describe("EpsFooter", () => {
  it("renders the footer element with role 'contentinfo'", () => {
    render(<EpsFooter />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })

  it("displays all footer links with correct text and href", () => {
    render(<EpsFooter />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(3)

    expect(links[0]).toHaveTextContent("Privacy notice (opens in new tab)")
    expect(links[0]).toHaveAttribute("href", "https://example.com/privacy")
    expect(links[0]).toHaveAttribute("target", "_blank")
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer")

    expect(links[1]).toHaveTextContent("Terms and conditions")
    expect(links[1]).toHaveAttribute("href", "terms-and-conditions")
    expect(links[1]).not.toHaveAttribute("target")

    expect(links[2]).toHaveTextContent("Cookie policy")
    expect(links[2]).toHaveAttribute("href", "cookies")
    expect(links[2]).not.toHaveAttribute("target")
  })

  it("displays the correct copyright message", () => {
    render(<EpsFooter />)
    const copyright = screen.getByTestId("eps_footer-copyright")
    expect(copyright).toHaveTextContent("© NHS England")
  })
})
