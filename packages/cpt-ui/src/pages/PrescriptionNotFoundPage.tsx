"use client"

import { BackLink, Container } from "nhsuk-react-components"
import { PRESCRIPTION_NOT_FOUND_STRINGS } from "@/constants/ui-strings/PrescriptionNotFoundPageStrings"

export default function PrescriptionNotFoundPage() {
    return (
        <main>
            <Container>
                <BackLink>{PRESCRIPTION_NOT_FOUND_STRINGS.backLinkText}</BackLink>
                <h1 data-testid="eps-404-header">{PRESCRIPTION_NOT_FOUND_STRINGS.headerText}</h1>
                <p data-testid="eps-404-body1">{PRESCRIPTION_NOT_FOUND_STRINGS.body1}</p>
            </Container>
        </main>
    )
}
