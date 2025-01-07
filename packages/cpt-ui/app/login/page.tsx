'use client'
import React, { useContext, useEffect, useCallback } from "react";

import { Container, Col, Row, Button } from "nhsuk-react-components";
import { AuthContext } from "@/context/AuthProvider";
import EpsSpinner from "@/components/EpsSpinner";

const MOCK_AUTH_ALLOWED = [
    "dev",
    "int",
    "qa",
    // "ref",
    // "prod"
]

export default function AuthPage() {
    const auth = useContext(AuthContext);

    // Use secure login by default
    const target_environment: string = process.env.NEXT_PUBLIC_TARGET_ENVIRONMENT || "prod";
    
    const mockSignIn = async () => {
        console.log("Signing in (Mock)", auth);
        await auth?.cognitoSignIn({
            provider: {
                custom: "Mock"
            }
        });
    }

    const signIn = useCallback(async () => {
        console.log("Signing in (Primary)", auth);
        await auth?.cognitoSignIn({
            provider: {
                custom: "Primary"
            }
        });
        console.log("Signed in: ", auth);
    }, [auth]);

    const signOut = async () => {
        console.log("Signing out", auth);
        await auth?.cognitoSignOut();
        console.log("Signed out: ", auth);
    }

    useEffect(() => {
        console.log(
          "Login page loaded. What environment are we in?",
          target_environment
        );
      
        // Only call signIn() if user is *not* in a mock environment AND *not* signed in yet.
        if (!MOCK_AUTH_ALLOWED.includes(target_environment) && !auth?.isSignedIn) {
          console.log("User must sign in with Primary auth");
          signIn();
        }
      }, [auth?.isSignedIn, signIn, target_environment]);

    useEffect(() => {
        console.log(auth);
    }, [auth])

    // TODO: This should show a spinner
    if (!MOCK_AUTH_ALLOWED.includes(target_environment)) {
        return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Col width="full">
                        <h1>Redirecting to CIS2 login page...</h1>
                        <EpsSpinner />
                    </Col>
                </Row>
            </Container>
        </main>
        )
    }

    return (
        <main className="nhsuk-main-wrapper">
            <Container>

                <Row>
                    <Col width="full">
                        <h1>Authorisation demonstration</h1>
                        <p>Since this is not actually set to be integrated into anything yet, I&apos;ve made this little page to show how login/logout works.</p>
                        <p>Note that this is the COGNITO login, and displays the relevant information.</p>
                        <p>The auth context carries around the logic and authorisation state, but takes no actions (yet) without explicit calls. It could be updated to monitor login status, and poll to check for serverside token retractions.</p>
                    </Col>
                </Row>
    
                <Row>
                    <Col width="full">
                        <Button id="primary-signin" style={{ margin: '8px' }} onClick={signIn}>Log in with PTL CIS2</Button>
                        <Button id="mock-signin" style={{ margin: '8px' }} onClick={mockSignIn}>Log in with mock CIS2</Button>
                        <Button id="signout" style={{ margin: '8px' }} onClick={signOut}>Sign Out</Button>
    
                        {auth && (
                            <>
                                <div>username: {auth.user?.username}</div>
                                <div>isSignedIn: {auth.isSignedIn} </div>
                                <div>idToken: {auth.idToken?.toString()}</div>
                                <div>accessToken: {auth.accessToken?.toString()}</div>
                                <h2>Auth Context</h2>
                                <pre>{JSON.stringify(auth, null, 2)}</pre>
                            </>
                        )}
                    </Col>
                </Row>
            </Container>
        </main>
    );
}
