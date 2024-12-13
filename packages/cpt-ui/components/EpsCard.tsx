import React from "react";
import { Card } from "nhsuk-react-components";
import "../assets/styles/card.scss";

// Define props type
interface EpsCardProps {
    orgName: string;
    odsCode: string;
    siteAddress: string | null;
    roleName: string;
    link: string;
}

export default function EpsCard({
    orgName,
    odsCode,
    siteAddress,
    roleName,
    link,
}: EpsCardProps) {
    return (
        <Card className="eps-card nhsuk-card--clickable eps-card__link" clickable>
                <Card.Content>
                    <div className="nhsuk-grid-row eps-card__content">
                        {/* Left Column: org_name and role_name */}
                        <div className="nhsuk-grid-column-one-half eps-card__left">
                            <Card.Heading>
                                <a href={link} >
                                    <span className="eps-card__orgName">
                                        {orgName} (ODS: {odsCode})
                                    </span>
                                </a>
                            </Card.Heading>
                            <Card.Description className="eps-card__roleName">
                                {roleName}
                            </Card.Description>
                        </div>
                        {/* Right Column: Address */}
                        <div className="nhsuk-grid-column-one-half eps-card__right">
                            <Card.Description className="eps-card__siteAddress">
                                {siteAddress &&
                                    siteAddress.split("\n").map((line: string, index: number) => (
                                        <span
                                            key={index}
                                            className="eps-card__siteAddress-line"
                                        >
                                            {line}
                                            <br />
                                        </span>
                                    ))}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Content>
        </Card>
    );
}
