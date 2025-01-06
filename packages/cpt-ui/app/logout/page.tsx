'use client'
import React, { useContext, useEffect } from "react";
import { Container } from "nhsuk-react-components";
import Link from "next/link";

import { AuthContext } from "@/context/AuthProvider";

export default function LogoutPage() {

    const auth = useContext(AuthContext);

    // Log out on page load
    useEffect(() => {
        const signOut = async () => {
            console.log("Signing out", auth);

            // DELETEME: [DEV] Wait 3 seconds
            await new Promise((resolve) => setTimeout(resolve, 3000));

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
                    <>
                        <h1>Logging out</h1>
                        <div>Spinny Spinner...</div>
                    </>
                ) : ( 
                    <>
                        <h1>Logout successful</h1>
                        <div>You are now logged out of the service. To continue using the application, you must log in again.</div>
                        <Link 
                            href="/login" 
                            className="nhsuk-button nhsuk-button--primary nhsuk-u-margin-top-5 nhsuk-u-margin-bottom-5"
                        >
                            Log in
                        </Link>
                    </>
                )}
            </Container>
        </main>
    );
}
