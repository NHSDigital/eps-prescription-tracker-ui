'use client'
import React, { useContext, useEffect } from "react";
import { Container, Button } from "nhsuk-react-components";
import { AuthContext } from "@/context/AuthProvider";

export default function LogoutPage() {

    const auth = useContext(AuthContext);

    // Log out on page load
    useEffect(() => {
        const signOut = async () => {
            console.log("Signing out", auth);
            await auth?.cognitoSignOut();
            console.log("Signed out: ", auth);
        }

        if (auth?.isSignedIn) {
            signOut();
        } else {
            console.log("Cannot sign out - not signed in");
        }
    }, [auth]);

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container role="contentinfo">
                {auth?.isSignedIn ? (
                    <h1>Logging out</h1>
                    // FIXME: Spinner here
                ) : ( 
                    <>
                        <h1>Logout successful</h1>
                        <div>You are now logged out of the service. To continue using the application, you must log in again.</div>
                        <Button href="/auth_demo" className="nhsuk-u-margin-top-5">
                            Log in
                        </Button>
                    </>
                )}
            </Container>
        </main>
    );
}
