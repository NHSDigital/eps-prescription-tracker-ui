// import React from "react"
// import {render, screen, fireEvent} from "@testing-library/react"
// import SessionSelectionPage from "@/pages/SessionSelection"
// import {HERO_TEXT} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
// import {AuthContextType} from "@/context/AuthProvider"

// // const defaultAuthState: AuthContextType = {
// //   isSignedIn: false,
// //   isSigningIn: false,
// //   user: null,
// //   error: null,
// //   rolesWithAccess: [],
// //   rolesWithoutAccess: [],
// //   hasNoAccess: false,
// //   hasSingleRoleAccess: false,
// //   selectedRole: undefined,
// //   userDetails: undefined,
// //   isConcurrentSession: false,
// //   cognitoSignIn: jest.fn().mockName("cognitoSignIn"),
// //   cognitoSignOut: jest.fn().mockName("cognitoSignOut"),
// //   clearAuthState: jest.fn().mockName("clearAuthState"),
// //   updateSelectedRole: jest.fn().mockName("updateSelectedRole"),
// //   forceCognitoLogout: jest.fn().mockName("forceCognitoLogout"),
// //   updateTrackerUserInfo: jest.fn().mockName("updateTrackerUserInfo")
// // }

// // const signedInAuthState: AuthContextType = {
// //   ...defaultAuthState,
// //   isSignedIn: true,
// //   user: "testUser"
// // }

// describe("SessionSelectionPage", () => {
//   it("renders without crashing", () => {
//     render(<SessionSelectionPage />)
//     expect(screen.getByText("Select a Session")).toBeInTheDocument()
//   })

//   it("allows the user to set their session as active", async () => {

//     render(<SessionSelectionPage />)
//     const sessionButton = screen.getByRole("button", {name: "new-session"})
//     fireEvent.click(sessionButton)
//     expect(await screen.findByText(HERO_TEXT)).toBeInTheDocument()
//   })
// })
