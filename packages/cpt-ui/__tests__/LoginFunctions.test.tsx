import {getHomeLink} from "@/helpers/loginFunctions"
import {FRONTEND_PATHS} from "@/constants/environment"

describe("getHomeLink", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it("returns /login when user is not logged in", () => {
    expect(getHomeLink(false)).toBe(FRONTEND_PATHS.LOGIN)
  })
  it("returns /search-by-prescription-id when user is logged in", () => {
    const validAuth = {
      isSignedIn: true,
      user: {username: "mockUser"},
      idToken: {},
      accessToken: {}
    }
    localStorage.setItem("auth", JSON.stringify(validAuth))
    expect(getHomeLink(true)).toBe(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)
  })
})
