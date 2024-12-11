import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the configureAmplify module
jest.mock("../context/configureAmplify", () => ({
  __esModule: true,
  authConfig: {
    Auth: {
      Cognito: {
        userPoolClientId: "mockUserPoolClientId",
        userPoolId: "mockUserPoolId",
        loginWith: {
          oauth: {
            domain: "mockHostedLoginDomain",
            scopes: ["openid", "email", "phone", "profile", "aws.cognito.signin.user.admin"],
            redirectSignIn: ["mockRedirectSignIn"],
            redirectSignOut: ["mockRedirectSignOut"],
            responseType: "code",
          },
          username: true,
          email: false,
          phone: false,
        },
      },
    },
  },
}));

// Mock the AuthContext with a valid value
jest.mock("../context/AuthContext", () => {
  const mockAuthContext = {
    signInWithRedirect: jest.fn(),
    signOut: jest.fn(),
    isAuthenticated: false,
  };
  return {
    __esModule: true,
    AuthContext: React.createContext(mockAuthContext),
  };
});

import AuthPage from "../app/auth_demo/page";

describe("AuthPage", () => {
  it("renders a page", () => {
    const page = render(<AuthPage />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();

    const primaryLogin = page.container.querySelector("#primary-signin")
    const mockLogin = page.container.querySelector("#mock-signin")
    const signout = page.container.querySelector("#signout")

    expect(primaryLogin).toBeInTheDocument();
    expect(mockLogin).toBeInTheDocument();
    expect(signout).toBeInTheDocument();
  });
});
