'use client'
import React from 'react';

import { Footer } from "nhsuk-react-components";

import {
    FOOTER_COPYRIGHT,
    FOOTER_VERSION
} from "../constants/ui-strings/FooterStrings";

export default function EpsFooter() {
    return (
        <Footer id="eps_footer" className="eps_footer">
            <Footer.List>
            </Footer.List>
            <Footer.Copyright>
                <small>
                    {FOOTER_COPYRIGHT}<br />
                    {FOOTER_VERSION && <> {FOOTER_VERSION}</>}
                </small>
            </Footer.Copyright>
        </Footer>
    )
}
