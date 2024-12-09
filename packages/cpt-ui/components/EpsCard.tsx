'use client';

import React from 'react';
import { Card } from "nhsuk-react-components";
import "../assets/styles/card.scss";

export default function EpsCard({ name, odsCode, address, specialty, link }) {
    return (
        <Card className="eps-card nhsuk-card--clickable" clickable>
            <a href={link} className="nhsuk-card__link">
                <Card.Content>
                    <div className="nhsuk-grid-row eps-card__content">
                        {/* Left Column: Name and Specialty */}
                        <div className="nhsuk-grid-column-one-half eps-card__left">
                            <Card.Heading>
                                <span className="eps-card__name">{name} (ODS: {odsCode})</span>
                            </Card.Heading>
                            <Card.Description className="eps-card__specialty">
                                {specialty}
                            </Card.Description>
                        </div>
                        {/* Right Column: Address */}
                        <div className="nhsuk-grid-column-one-half eps-card__right">
                            <Card.Description className="eps-card__address">
                                {address ? (
                                    address.split('\n').map((line, index) => (
                                        <span key={index} className="eps-card__address-line">
                                            {line}
                                            <br />
                                        </span>
                                    ))
                                ) : (
                                    <span>No address found</span>
                                )}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Content>
            </a>
        </Card>
    );
}
