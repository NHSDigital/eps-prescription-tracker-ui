import "@testing-library/jest-dom"
import React from "react"
import {render, screen} from "@testing-library/react"
import EpsRichText from "@/components/EpsRichText"
import type {RichTextNode} from "@/components/EpsRichText"

describe("EpsRichText", () => {
  describe("plain string content", () => {
    it("renders a single string", () => {
      render(<EpsRichText content="Hello world" />)
      expect(screen.getByText("Hello world")).toBeInTheDocument()
    })

    it("renders multiple strings from an array", () => {
      const {container} = render(<EpsRichText content={["Hello ", "world"]} />)
      expect(container).toHaveTextContent("Hello world")
    })
  })

  describe("link node content", () => {
    it("renders a single internal link node", () => {
      const node: RichTextNode = {text: "Prescription Tracker", href: "/site"}
      render(<EpsRichText content={node} />)
      const link = screen.getByRole("link", {name: "Prescription Tracker"})
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/site")
      expect(link).not.toHaveAttribute("target")
      expect(link).not.toHaveAttribute("rel")
    })

    it("renders an external link with target and rel attributes", () => {
      const node: RichTextNode = {
        text: "AbilityNet (opens in new tab)",
        href: "https://www.abilitynet.org.uk/",
        external: true
      }
      render(<EpsRichText content={node} />)
      const link = screen.getByRole("link", {name: "AbilityNet (opens in new tab)"})
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "https://www.abilitynet.org.uk/")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noreferrer")
    })

    it("does not add target/rel when external is false", () => {
      const node: RichTextNode = {text: "Click here", href: "/somewhere", external: false}
      render(<EpsRichText content={node} />)
      const link = screen.getByRole("link", {name: "Click here"})
      expect(link).not.toHaveAttribute("target")
      expect(link).not.toHaveAttribute("rel")
    })
  })

  describe("mixed array content", () => {
    it("renders a mix of strings and link nodes", () => {
      const content: Array<RichTextNode> = [
        "This applies to the ",
        {text: "Prescription Tracker", href: "/site"},
        "."
      ]
      const {container} = render(<EpsRichText content={content} />)
      expect(container).toHaveTextContent(/This applies to the/)
      expect(container).toHaveTextContent(/\.$/)
      const link = screen.getByRole("link", {name: "Prescription Tracker"})
      expect(link).toHaveAttribute("href", "/site")
    })

    it("renders multiple links in one array", () => {
      const content: Array<RichTextNode> = [
        {text: "First link", href: "/first"},
        " and ",
        {text: "Second link", href: "/second", external: true}
      ]
      render(<EpsRichText content={content} />)
      const first = screen.getByRole("link", {name: "First link"})
      const second = screen.getByRole("link", {name: "Second link"})
      expect(first).toHaveAttribute("href", "/first")
      expect(first).not.toHaveAttribute("target")
      expect(second).toHaveAttribute("href", "/second")
      expect(second).toHaveAttribute("target", "_blank")
    })

    it("renders a mailto link correctly", () => {
      const content: Array<RichTextNode> = [
        "Contact us at ",
        {text: "england.prescriptiontrackerpilot@nhs.net", href: "mailto:england.prescriptiontrackerpilot@nhs.net"}
      ]
      render(<EpsRichText content={content} />)
      const link = screen.getByRole("link", {name: "england.prescriptiontrackerpilot@nhs.net"})
      expect(link).toHaveAttribute("href", "mailto:england.prescriptiontrackerpilot@nhs.net")
    })
  })
})
