import React, {useEffect} from "react"
import {Footer} from "nhsuk-react-components"

import {FOOTER_COPYRIGHT, COMMIT_ID, FOOTER_LINKS} from "@/constants/ui-strings/FooterStrings"

export default function EpsFooter() {
  useEffect(() => {
    console.log("Viewing site version of commit ID:", COMMIT_ID)
  }, [])

  return (
    <Footer id="eps_footer" className="eps_footer">
      <Footer.List>
        {FOOTER_LINKS.map(({href, text, external}, index) => (
          <Footer.ListItem key={index}>
            <a
              className="nhsuk-footer__list-item-link"
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
            >
              {text}
            </a>
          </Footer.ListItem>
        ))}
      </Footer.List>

      <Footer.Copyright data-testid="eps_footer-copyright">
        <p>
          <small>
            {FOOTER_COPYRIGHT}
          </small>
        </p>
      </Footer.Copyright>
    </Footer>
  )
}
