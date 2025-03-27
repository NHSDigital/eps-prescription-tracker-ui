import React, { useContext, useEffect } from "react";
import { Container } from "nhsuk-react-components";
import { Link } from "react-router-dom"

import { AuthContext } from "@/context/AuthProvider";
import { useAccess } from "@/context/AccessProvider";
import EpsSpinner from "@/components/EpsSpinner";
import { EpsLogoutStrings } from "@/constants/ui-strings/EpsLogoutPageStrings";

export default function LogoutPage() {
  const auth = useContext(AuthContext);
  const access = useAccess();

  // Log out on page load
  useEffect(() => {
    const signOut = async () => {
      console.log("Signing out", auth);

      await auth?.cognitoSignOut();

      // Ensure user details & roles are cleared from local storage
      access.clear();
      console.log("Signed out and cleared session data");
    };

    if (auth?.isSignedIn) {
      signOut();
    } else {
      console.log("Cannot sign out - not signed in");
      access.clear(); // Clear data even if not signed in
    }
  }, [auth, access.clear]);

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {!auth?.isSignedIn ? (
          <>
            <h1>{EpsLogoutStrings.title}</h1>
            <p>{EpsLogoutStrings.body}</p>
            <Link to="/login">{EpsLogoutStrings.login_link}</Link>
          </>
        ) : (
          <>
            <h1>{EpsLogoutStrings.loading}</h1>
            <EpsSpinner />
          </>
        )}
      </Container>
    </main>
  );
}
