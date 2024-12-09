'use client';

import React from 'react';

// Card Component
export function Card({ name, odsCode, address, specialty }) {
    return (
        <li className="nhsuk-grid-column-one-third nhsuk-card-group__item">
            <div className="nhsuk-card nhsuk-card--clickable">
                <div className="nhsuk-card__content">
                    {/* Header */}
                    <h5 className="nhsuk-card__heading nhsuk-heading-xs">
                        <a className="nhsuk-card__link" href="#">
                            {name} (ODS: {odsCode})
                        </a>
                    </h5>
                    {/* Address Section */}
                    <p className="nhsuk-card__address">
                        {address ? (
                            address.split('\n').map((line, index) => (
                                <span key={index} className="address-line">
                                    {line}
                                    <br />
                                </span>
                            ))
                        ) : (
                            <span>No address found</span>
                        )}
                    </p>
                    {/* Specialty */}
                    <p className="nhsuk-card__specialty">{specialty}</p>
                </div>
            </div>
        </li>
    );
}

// CardGroup Component
export default function CardGroup() {
    const cards = [
        {
            name: 'JONES SURGERY',
            odsCode: 'RCD60',
            address: '4 Sardinia street\nHolborn\nLondon\nSE4 6ER',
            specialty: 'General Medical Practitioner',
        },
        {
            name: 'JONES SURGERY',
            odsCode: 'RCD60',
            address: null, // No address
            specialty: 'General Medical Practitioner',
        },
    ];

    return (
        <ul className="nhsuk-grid-row nhsuk-card-group">
            {cards.map((card, index) => (
                <Card
                    key={index}
                    name={card.name}
                    odsCode={card.odsCode}
                    address={card.address}
                    specialty={card.specialty}
                />
            ))}
        </ul>
    );
}
