import React, {useEffect} from "react"
import {Footer} from "nhsuk-react-components"

import {FOOTER_COPYRIGHT, COMMIT_ID, FOOTER_LINKS} from "@/constants/ui-strings/FooterStrings"

export default function EpsFooter() {
  useEffect(() => {
    console.log("Viewing site version of commit ID:", COMMIT_ID)
  }, [])

  return (
    <Footer id="eps_footer" className="eps_footer" data-testid="eps_footer">
      <Footer.List>
        {FOOTER_LINKS.map(({href, text, external, testId}, index) => (
          <Footer.ListItem
            key={index}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            data-testid={testId}
          >
            {text}
          </Footer.ListItem>
        ))}
      </Footer.List>

      <Footer.Copyright data-testid="eps_footer-copyright">
        {FOOTER_COPYRIGHT}
      </Footer.Copyright>
    </Footer >
  )
}
