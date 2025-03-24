"use client";

import { Link, useSearchParams } from "react-router-dom";
import { BackLink, Container } from "nhsuk-react-components";
import { PRESCRIPTION_NOT_FOUND_STRINGS } from "@/constants/ui-strings/PrescriptionNotFoundPageStrings";

export default function PrescriptionNotFoundPage() {
    const [searchParams] = useSearchParams();
    const searchType = searchParams.get("searchType");
    const backLinkUrl = `/search${searchType ? `#${searchType}` : ""}`;

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container>
                <BackLink
                    asElement={Link}
                    to={backLinkUrl}
                >
                    {PRESCRIPTION_NOT_FOUND_STRINGS.backLinkText}
                </BackLink>
                <h1 data-testid="eps-presc-not-found-header">
                    {PRESCRIPTION_NOT_FOUND_STRINGS.headerText}
                </h1>
                <p data-testid="eps-presc-not-found-body1">
                    {PRESCRIPTION_NOT_FOUND_STRINGS.body1}
                </p>
            </Container>
        </main>
    );
}
