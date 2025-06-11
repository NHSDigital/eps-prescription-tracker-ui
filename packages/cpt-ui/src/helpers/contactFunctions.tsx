export const createEmailLink = (email: string, text: string | null = null) => (
  <a href={`mailto:${email}`}>{text || email}</a>
)

export const createPhoneLink = (phone: string, text: string | null = null) => (
  <a href={`tel:${phone.replace(/\s/g, "")}`}>{text || phone}</a>
)
