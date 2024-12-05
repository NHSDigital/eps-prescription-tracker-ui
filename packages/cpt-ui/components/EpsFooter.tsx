'use client'
import React from 'react';

import { Footer } from "nhsuk-react-components";

import {
    FOOTER_COPYRIGHT
} from "@/constants/ui-strings/FooterStrings"

export default function EpsFooter() {
    return (
        <Footer id="eps_footer" className="eps_footer">
            <Footer.List>
            </Footer.List>
            <Footer.Copyright data-testid="eps_footer-copyright">
                <small>
                    {FOOTER_COPYRIGHT}
                </small>
            </Footer.Copyright>
        </Footer>
    )
}
