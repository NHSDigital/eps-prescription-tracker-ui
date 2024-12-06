'use client'
import React from "react";

import { Button, Card, Container, Col, InsetText, Row, Tabs } from "nhsuk-react-components";
export default function Page() {
    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Container role="contentinfo">
                        <Row>
                            <Col width="full">
                                <h1 className='nhsuk-heading-xl '>
                                    <span role="text">Select your role
                                        <span className="nhsuk-caption-l nhsuk-caption--bottom">
                                            <span className="nhsuk-u-visually-hidden"> - </span>
                                            Select the role you wish to use to access the service.
                                        </span></span></h1>
                            </Col>
                        </Row>
                        <Row>
                            <Col width='two-thirds'>
                                <InsetText className="nhsuk-u-margin-top-0">
                                    <p>
                                        You are currently logged in at <span className='nhsuk-u-font-weight-bold tl-nhsuk-u-text-uppercase'>Greenes Pharmacy (ods:4ft)</span> with <strong>Health Professional Access Role</strong>.
                                    </p>
                                </InsetText>
                                <Button>
                                    Confirm and continue to find a prescription
                                </Button>
                                <p>Alternatively, you can choose a new role below.</p>

                                <Card clickable className='tl-nhsuk-newComponent'>
                                    <Card.Content>
                                        <Card.Heading className="nhsuk-heading-m">
                                            <Card.Link href="#">
                                                Introduction to care and support
                                            </Card.Link>
                                        </Card.Heading>
                                        <Card.Description>
                                            A quick guide for people who have care and support needs and their carers
                                        </Card.Description>
                                    </Card.Content>
                                </Card>
                            </Col>
                        </Row>
                        <Row>
                            <Tabs>
                                <Tabs.Title>Contents</Tabs.Title>
                                <Tabs.List>
                                    <Tabs.ListItem id="past-day">Past day</Tabs.ListItem>
                                    <Tabs.ListItem id="past-week">Past week</Tabs.ListItem>
                                    <Tabs.ListItem id="past-month">Past month</Tabs.ListItem>
                                </Tabs.List>

                                <Tabs.Contents id="past-day">
                                    <div>Past day contents go here</div>
                                </Tabs.Contents>

                                <Tabs.Contents id="past-week">
                                    <div>Past week contents go here</div>
                                </Tabs.Contents>

                                <Tabs.Contents id="past-month">
                                    <div>Past month contents go here</div>
                                </Tabs.Contents>
                            </Tabs>
                        </Row>
                    </Container>
                </Row>
            </Container>
        </main>
    )
}
