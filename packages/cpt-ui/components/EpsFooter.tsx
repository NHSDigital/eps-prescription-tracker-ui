'use client'
import React from 'react';

import { Footer } from "nhsuk-react-components";

import {
    FOOTER_COPYRIGHT,
    COMMIT_ID
} from "@/constants/ui-strings/FooterStrings"

export default function EpsFooter() {
    return (
        <Footer id="eps_footer" className="eps_footer">
            {COMMIT_ID ? (
                <Footer.List>
                    <small>
                        {COMMIT_ID}
                    </small>
                </Footer.List>
            ) : (
                <div />
            )}
            <Footer.Copyright data-testid="eps_footer-copyright">
                <small>
                    {FOOTER_COPYRIGHT}
                </small>
            </Footer.Copyright>
        </Footer>
    )
}
