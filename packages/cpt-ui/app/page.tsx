'use client'
import React from "react";

import { Container, Col, Row, Button } from "nhsuk-react-components";
import { AuthContext } from "../context/AuthContext";

export default function Page() {
    const auth = React.useContext(AuthContext);

    const mockSignIn = () => {
        auth?.signInWithRedirect({
            provider: {
                custom: "Mock"
            }
        });
    }

    const signIn = () => {
        auth?.signInWithRedirect({
            provider: {
                custom: "Primary"
            }
        });
    }

    const signOut = () => {
        auth?.signOut();
    }

    return (
        <main className="nhsuk-main-wrapper">
            <Container>

                <Row>
                    <Col width="full">
                        <h1>Hello World</h1>
                        <p>Etiam lobortis! dolor ac facilisis efficitur, metus leo posuere est, non pharetra orci velit non velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Ut finibus sagittis diam ac feugiat. Curabitur eget venenatis arcu. Ut commodo tempor sollicitudin. Nulla nec congue mauris. Sed cursus interdum arcu. Morbi lacinia lorem ut ante feugiat, eu cursus nisi ultricies.</p>
                    </Col>
                </Row>
    
                <Row>
                    <Col width="full">
                        <Button onClick={() => signIn}>Log in with PTL CIS2</Button>
                        <Button onClick={() => mockSignIn}>Log in with mock CIS2</Button>
                        <Button onClick={() => signOut}>Sign Out</Button>
    
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
