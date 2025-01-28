import React, { useEffect } from "react";

import { Footer } from "nhsuk-react-components";

import {
  FOOTER_COPYRIGHT,
  COMMIT_ID,
} from "@/constants/ui-strings/FooterStrings";

export default function EpsFooter() {
  useEffect(() => {
    console.log("Viewing site version of commit ID:", COMMIT_ID);
  }, []);

  return (
    <Footer id="eps_footer" className="eps_footer">
      {COMMIT_ID ? (
        <Footer.List>
          <small>{COMMIT_ID}</small>
        </Footer.List>
      ) : (
        <div />
      )}
      <Footer.Copyright data-testid="eps_footer-copyright">
        <small>{FOOTER_COPYRIGHT}</small>
      </Footer.Copyright>
    </Footer>
  );
}
