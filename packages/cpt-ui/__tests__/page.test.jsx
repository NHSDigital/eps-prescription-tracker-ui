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
jest.mock("../context/AuthProvider", () => {
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

import Page from "../app/page";

describe("Page", () => {
  it("renders a heading", () => {
    render(<Page />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading).toBeInTheDocument();
  });
});
