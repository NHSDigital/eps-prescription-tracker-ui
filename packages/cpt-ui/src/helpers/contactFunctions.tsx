export const createEmailLink = (email, text = null) => (
  <a href={`mailto:${email}`}>{text || email}</a>
)

// Helper function to create tel links
export const createPhoneLink = (phone, text = null) => (
  <a href={`tel:${phone.replace(/\s/g, "")}`}>{text || phone}</a>
)
