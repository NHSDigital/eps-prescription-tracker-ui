'use client';

import React from 'react';

export function Card({ name, odsCode, address, specialty }) {
    return (
        <li className="nhsuk-grid-column-one-third nhsuk-card-group__item">
            <div className="nhsuk-card nhsuk-card--clickable">
                <div className="nhsuk-card__content">
                    <h5 className="nhsuk-card__heading nhsuk-heading-xs">
                        <a className="nhsuk-card__link" href="#">
                            {name} (ODS: {odsCode})
                        </a>
                    </h5>
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
                    <p className="nhsuk-card__specialty">{specialty}</p>
                </div>
            </div>
        </li>
    );
}
