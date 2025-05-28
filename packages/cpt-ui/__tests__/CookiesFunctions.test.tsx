import {isUserLoggedIn} from "@/helpers/cookiesFunctions"

describe("Auth Utility Functions", () => {
  describe("isUserLoggedIn", () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it("returns false when there is no auth item in localStorage", () => {
      expect(isUserLoggedIn()).toBe(false)
    })

    it("returns false when auth item is not valid JSON", () => {
      localStorage.setItem("auth", "not-json")
      expect(isUserLoggedIn()).toBe(false)
    })

    it.each([
      [{isSignedIn: false, user: {username: "Mock"}}, false],
      [{isSignedIn: true, user: null}, false],
      [{user: {username: "Mock"}}, false]
    ])("returns %s when localStorage.auth = %j", (auth, expected) => {
      localStorage.setItem("auth", JSON.stringify(auth))
      expect(isUserLoggedIn()).toBe(expected)
    })

    it("returns true when localStorage.auth has valid isSignedIn and user object", () => {
      const validAuth = {
        isSignedIn: true,
        user: {
          username: "Mock_f02c01fc-3ffc-4899-b2cc-e5b16127f1a7",
          userId: "96e252d4-e091-7014-3751-6cdb7465f4c6"
        },
        idToken: {},
        accessToken: {}
      }

      localStorage.setItem("auth", JSON.stringify(validAuth))
      expect(isUserLoggedIn()).toBe(true)
    })
  })
})
