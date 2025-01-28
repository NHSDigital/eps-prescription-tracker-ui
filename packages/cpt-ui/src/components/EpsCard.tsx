import React from "react";
import { Card, Col, Row } from "nhsuk-react-components";

// import "@/assets/styles/card.scss";

import { useAccess } from "@/context/AccessProvider";
import { useNavigate } from "react-router-dom";

export interface EpsCardProps {
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
  const navigate = useNavigate();
  const { setSelectedRole } = useAccess();

  const handleSetSelectedRole = async (e: React.MouseEvent) => {
    e.preventDefault();

    // TODO: Needs to be implemented properly.
    console.warn("SETTING SELECTED ROLE TO A PLACEHOLDER VALUE");
    setSelectedRole("PLACEHOLDER");

    navigate(link);
  };

  return (
    <Card clickable className="eps-card">
      <Card.Content>
        <Row className="nhsuk-grid-row eps-card__content">
          {/* Left Column: org_name and role_name */}
          <Col width="one-half">
            <Card.Link href={link} onClick={handleSetSelectedRole}>
              <Card.Heading className="nhsuk-heading-s">
                {orgName}
                <br />
                (ODS: {odsCode})
              </Card.Heading>
            </Card.Link>
            <Card.Description className="eps-card__roleName">
              {roleName}
            </Card.Description>
          </Col>

          {/* Right Column: siteAddress */}
          <Col width="one-half">
            <Card.Description className="eps-card__siteAddress">
              {siteAddress &&
                siteAddress.split("\n").map((line: string, index: number) => (
                  <span key={index} className="eps-card__siteAddress-line">
                    {line}
                    <br />
                  </span>
                ))}
            </Card.Description>
          </Col>
        </Row>
      </Card.Content>
    </Card>
  );
}
