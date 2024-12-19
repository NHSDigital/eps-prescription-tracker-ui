'use client'
import React, {useContext, useEffect} from "react";

import { Container, Col, Row, Button } from "nhsuk-react-components";
import { AuthContext } from "@/context/AuthProvider";

export default function AuthPage() {
    const auth = useContext(AuthContext);

    useEffect(() => {
        console.log(auth);
    }, [auth])

    const mockSignIn = async () => {
        console.log("Signing in (Mock)", auth);
        await auth?.cognitoSignIn({
            provider: {
                custom: "Mock"
            }
        });
    }

    const signIn = async () => {
        console.log("Signing in (Primary)", auth);
        await auth?.cognitoSignIn({
            provider: {
                custom: "Primary"
            }
        });
    }

    const signOut = async () => {
        console.log("Signing out", auth);
        await auth?.cognitoSignOut();
        console.log("Signed out: ", auth);
    }

    return (
        <main className="nhsuk-main-wrapper">
            <Container>

                <Row>
                    <Col width="full">
                        <h1>Login dev page</h1>
                        <p>Here, you can choose how to authorise with the app. Note that we do not have PTL login for PR deployments</p>
                        <p>Note that this is the COGNITO login, and displays the relevant information. The backend handles CIS2 and APIGEE tokens.</p>
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
