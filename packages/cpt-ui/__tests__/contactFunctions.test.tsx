import {render} from "@testing-library/react"
import {createPhoneLink, createEmailLink} from "@/helpers/contactFunctions"

describe("Contact Helper Functions", () => {
  describe("createEmailLink", () => {
    it("creates a mailto link", () => {
      const email = "test@example.com"
      const customText = "Contact Us"
      const result = render(createEmailLink(email, customText))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `mailto:${email}`)
      expect(link).toHaveTextContent(customText)
    })

    it.each([
      ["simple@example.com", "Simple Email"],
      ["complex.email+tag@sub.domain.co.uk", "Complex Email"],
      ["user123@test-domain.org", null]
    ])("creates correct mailto link for email %s with text %s", (email, text) => {
      const result = render(createEmailLink(email, text))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `mailto:${email}`)
      expect(link).toHaveTextContent(text || email)
    })
  })

  describe("createPhoneLink", () => {
    it("creates a phone link", () => {
      const phone = "01234567890"
      const customText = "Call Support"
      const result = render(createPhoneLink(phone, customText))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `tel:${phone}`)
      expect(link).toHaveTextContent(customText)
    })

    it("removes spaces from phone number in href but keeps them in display text", () => {
      const phoneWithSpaces = "0303 123 1113"
      const phoneWithoutSpaces = "03031231113"
      const result = render(createPhoneLink(phoneWithSpaces))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `tel:${phoneWithoutSpaces}`)
      expect(link).toHaveTextContent(phoneWithSpaces)
    })

    it("removes spaces from phone number in href when custom text provided", () => {
      const phoneWithSpaces = "0303 123 1113"
      const phoneWithoutSpaces = "03031231113"
      const customText = "ICO Helpline"
      const result = render(createPhoneLink(phoneWithSpaces, customText))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `tel:${phoneWithoutSpaces}`)
      expect(link).toHaveTextContent(customText)
    })

    it("creates a tel link with phone number as display text when text is null", () => {
      const phone = "+441234567890"
      const result = render(createPhoneLink(phone, null))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `tel:${phone}`)
      expect(link).toHaveTextContent(phone)
    })

    it.each([
      ["01234567890", null, "01234567890"],
      ["0303 123 1113", "ICO Number", "03031231113"],
      ["+44 303 123 1113", "International ICO", "+443031231113"],
      ["020 7946 0958", "London Office", "02079460958"]
    ])("creates correct tel link for phone %s with text %s, href should be tel:%s", (phone, text, expectedHref) => {
      const result = render(createPhoneLink(phone, text))

      const link = result.getByRole("link")
      expect(link).toHaveAttribute("href", `tel:${expectedHref}`)
      expect(link).toHaveTextContent(text || phone)
    })
  })
})
