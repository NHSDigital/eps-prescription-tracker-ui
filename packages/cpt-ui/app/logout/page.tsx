'use client'
import React, { useContext, useEffect } from "react";
import { Container } from "nhsuk-react-components"
import Link from "next/link";

import { AuthContext } from "@/context/AuthProvider";
import EpsSpinner from "@/components/EpsSpinner";

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

    // TODO: Move strings to a constants file
    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container>
                {auth?.isSignedIn ? (
                    <>
                        <h1>Logging out</h1>
                        <EpsSpinner />
                    </>
                ) : (
                    <>
                        <h1>Logout successful</h1>
                        <div>You are now logged out of the service. To continue using the service, you must log in again.</div>
                        <p />
                        <Link href="/login">
                            Log in
                        </Link>
                    </>
                )}
            </Container>
        </main>
    );
}
