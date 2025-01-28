import React, { useContext, useEffect } from "react";
import { Container } from "nhsuk-react-components";
import { Link } from "react-router-dom";

import { AuthContext } from "@/context/AuthProvider";
import { useAccess } from "@/context/AccessProvider";
import EpsSpinner from "@/components/EpsSpinner";
import { EpsLogoutStrings } from "@/constants/ui-strings/EpsLogoutPageStrings";

export default function LogoutPage() {
  const auth = useContext(AuthContext);
  const { clear } = useAccess();

  useEffect(() => {
    const signOut = async () => {
      console.log("Signing out", auth);
      await auth?.cognitoSignOut();
      console.log("Signed out: ", auth);
    };

    if (auth?.isSignedIn) {
      signOut();
      clear();
    } else {
      console.log("Cannot sign out - not signed in");
    }
  }, [auth, clear]);

  return (
    <main id="main-content" className="nhsuk-main-wrapper">
      <Container>
        {auth?.isSignedIn ? (
          <>
            <h1>{EpsLogoutStrings.loading}</h1>
            <EpsSpinner />
          </>
        ) : (
          <>
            <h1>{EpsLogoutStrings.title}</h1>
            <div>{EpsLogoutStrings.body}</div>
            <p />
            <Link to="/login">{EpsLogoutStrings.login_link}</Link>
          </>
        )}
      </Container>
    </main>
  );
}
