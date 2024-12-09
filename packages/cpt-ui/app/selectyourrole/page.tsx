'use client';

import React from "react";
import { Container, Row, Col, Button, InsetText } from "nhsuk-react-components";
import EpsCard from "../../components/EpsCard";
import {
  ROLE_CARDS,
  SELECT_ROLE_PAGE_TEXT,
} from "../../constants/ui-strings/CardStrings";

export default function Page() {
  const { title, caption, insetText, confirmButton, alternativeMessage } =
    SELECT_ROLE_PAGE_TEXT;

  return (
    <main className="nhsuk-main-wrapper">
      <Container>
        {/* Title Section */}
        <Row>
          <Col width="two-thirds">
            <h1 className="nhsuk-heading-xl">
              <span role="text">
                {title}
                <span className="nhsuk-caption-l nhsuk-caption--bottom">
                  <span className="nhsuk-u-visually-hidden"> - </span>
                  {caption}
                </span>
              </span>
            </h1>
            {/* Inset Text Section */}
            <section role="contentinfo" aria-label="Login Information">
              <InsetText>
                <span className="nhsuk-u-visually-hidden">{insetText.visuallyHidden}</span>
                <p>{insetText.message}</p>
              </InsetText>
              {/* Confirm Button */}
              <Button href={confirmButton.link}>{confirmButton.text}</Button>
              <p>{alternativeMessage}</p>
            </section>
          </Col>
        </Row>

        {/* Role Cards Section */}
        <Row>
          {ROLE_CARDS.map((role, index) => (
            <Col width="two-thirds" key={index}>
              <EpsCard
                name={role.name}
                odsCode={role.odsCode}
                address={role.address}
                specialty={role.specialty}
                link={role.link}
              />
            </Col>
          ))}
        </Row>
      </Container>
    </main>
  );
}
