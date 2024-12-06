'use client'
import React from "react";

import { Button, Card, Container, Col, InsetText, Row } from "nhsuk-react-components";
export default function Page() {
    return (
        <main className="nhsuk-main-wrapper">
            <Container>
                <Row>
                    <Container role="contentinfo">
                        <Row>
                            <Col width="full">
                                <h1 className='nhsuk-heading-xl '>
                                    <span role="text">Hello World</span></h1>
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam posuere semper libero, nec vehicula turpis varius vitae. Donec sodales ullamcorper fringilla. Donec ultrices neque et convallis venenatis. Morbi consequat, diam quis efficitur condimentum, augue quam finibus orci, et ornare sapien odio vitae lorem. Phasellus iaculis sagittis lacus, eget commodo dolor feugiat in. Vivamus facilisis ligula quis mattis ultricies. Ut luctus neque et maximus fringilla. Pellentesque venenatis augue eu lacus finibus luctus. Integer vel nulla risus. Suspendisse in cursus ante, at auctor arcu. Nunc hendrerit nec nisi non venenatis. Mauris aliquet convallis pharetra. Mauris ac velit arcu. Vivamus eget metus sed sapien tempor tristique ut sit amet magna. Mauris interdum at nunc non imperdiet. Proin dictum tempor nunc quis sollicitudin.</p>
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

                    </Container>
                </Row>
            </Container>
        </main>
    )
}
