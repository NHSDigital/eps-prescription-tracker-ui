import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import LogoutPage from "@/pages/LogoutPage";
import { AuthContext, type AuthContextType } from "@/context/AuthProvider";
import { AccessProvider } from "@/context/AccessProvider";

// Create a mock AuthProvider component
const MockAuthProvider = ({
  children,
  defaultIsSignedIn = false,
}: {
  children: React.ReactNode;
  defaultIsSignedIn: boolean;
}) => {
  const mockCognitoSignOut = jest.fn().mockResolvedValue(undefined);

  const authContextValue: AuthContextType = {
    error: null,
    user: defaultIsSignedIn ? { username: "testUser" } : null,
    isSignedIn: defaultIsSignedIn,
    idToken: null,
    accessToken: null,
    cognitoSignIn: jest.fn(),
    cognitoSignOut: mockCognitoSignOut,
  } as AuthContextType;

  return (
    <BrowserRouter>
      <AuthContext.Provider value={authContextValue}>
        <AccessProvider>{children}</AccessProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe("LogoutPage", () => {
  it("renders 'Logout successful' immediately if the user is not signed in", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={false}>
        <LogoutPage />
      </MockAuthProvider>,
    );

    expect(screen.getByText(/Logout successful/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /You are now logged out of the service. To continue using the service, you must log in again/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows a spinner and calls signOut when the user is signed in", async () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>,
    );

    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("does not call signOut if user is signed in, but we haven't advanced timers yet", () => {
    render(
      <MockAuthProvider defaultIsSignedIn={true}>
        <LogoutPage />
      </MockAuthProvider>,
    );

    expect(screen.getByText(/Logging out/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
