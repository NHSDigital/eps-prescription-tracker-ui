import React, {useEffect} from "react"
import {Footer} from "nhsuk-react-components"

import {
  FOOTER_COPYRIGHT,
  COMMIT_ID,
  FOOTER_LINKS,
  VERSION_NUMBER
} from "@/constants/ui-strings/FooterStrings"
import {logger} from "@/helpers/logger"

export default function EpsFooter() {
  useEffect(() => {
    logger.info("Viewing site version:", {COMMIT_ID, VERSION_NUMBER})
  }, [])

  return (
    <Footer id="eps_footer" className="eps_footer" data-testid="eps_footer">
      <Footer.List>
        {FOOTER_LINKS.map(({href, text, external, testId}) => (
          <Footer.ListItem
            key={testId}
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
