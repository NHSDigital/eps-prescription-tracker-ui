import {getHomeLink} from "@/helpers/loginFunctions"
import {useAuth} from "@/context/AuthProvider"

const auth = useAuth()
describe("getHomeLink", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it("returns /login when user is not logged in", () => {
    expect(getHomeLink(auth.isSignedIn)).toBe("/site/login")
  })
  it("returns /search-by-prescription-id when user is logged in", () => {
    const validAuth = {
      isSignedIn: true,
      user: {username: "mockUser"},
      idToken: {},
      accessToken: {}
    }
    localStorage.setItem("auth", JSON.stringify(validAuth))
    expect(getHomeLink(auth.isSignedIn)).toBe("/site/search-by-prescription-id")
  })
})
