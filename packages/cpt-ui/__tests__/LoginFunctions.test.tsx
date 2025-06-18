import {getHomeLink} from "@/helpers/loginFunctions"

describe("getHomeLink", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it("returns /login when user is not logged in", () => {
    expect(getHomeLink(false)).toBe("/login")
  })
  it("returns /search-by-prescription-id when user is logged in", () => {
    const validAuth = {
      isSignedIn: true,
      user: {username: "mockUser"},
      idToken: {},
      accessToken: {}
    }
    localStorage.setItem("auth", JSON.stringify(validAuth))
    expect(getHomeLink(true)).toBe("/search-by-prescription-id")
  })
})
