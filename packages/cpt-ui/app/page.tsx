'use client'
import React from "react";

import { Button, Card, Container, Col, InsetText, Row } from "nhsuk-react-components";
export default function Page() {
    return (
        <main className="nhsuk-main-wrapper">
            <Container>

                <Row>
                    <Col width="full">
                        <h1>Hello World</h1>
                        <p>Hello World.  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas sodales metus nisl. Duis vitae vehicula dui, eu sollicitudin ante. Fusce aliquet et massa in pretium. Pellentesque bibendum, justo sit amet venenatis egestas, augue tortor sodales tellus, id finibus arcu mauris ut velit. Etiam non turpis vel massa molestie venenatis. Vivamus ac nunc sit amet metus eleifend porta eu eget mi. Sed at finibus lectus, et tincidunt quam. Praesent tempor turpis in lobortis vulputate. Sed feugiat rutrum purus in cursus. Duis facilisis eu odio non facilisis. Suspendisse libero ligula, vestibulum ut libero non, bibendum accumsan diam. Nunc quis placerat turpis. In hac habitasse platea dictumst. Interdum et malesuada fames ac ante ipsum primis in faucibus.</p>
                        <p>Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec consectetur eu elit maximus iaculis. Donec vel lobortis turpis. Mauris vel sagittis lectus. Donec nec sapien felis. Donec risus sem, ullamcorper nec nulla quis, molestie varius urna. Pellentesque a elit quis orci luctus pellentesque. Donec scelerisque porttitor massa tempor mattis. Cras non elit quis leo ultricies porta. Phasellus pulvinar quam faucibus molestie dignissim. Phasellus libero nunc, fermentum quis dapibus vel, efficitur quis erat. Duis efficitur aliquam feugiat. Ut tortor ipsum, commodo id pulvinar nec, hendrerit finibus libero. Sed nec condimentum magna, vitae imperdiet dolor. Donec sed malesuada enim, convallis vulputate orci.</p>
                        <p>Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Vestibulum aliquam luctus viverra. Vivamus a ligula elit. Maecenas ut erat efficitur, rutrum ligula at, bibendum nisi. Curabitur iaculis, ante tempus aliquet lobortis, ligula dui commodo tortor, ac malesuada nunc metus nec sapien. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Ut auctor dapibus neque, quis interdum est iaculis a. Cras pulvinar congue justo, a tincidunt nunc semper in. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Mauris malesuada magna vitae ultricies porttitor. Duis sit amet sem nec sapien sollicitudin malesuada. Praesent fringilla, arcu sit amet ultrices feugiat, ligula justo accumsan purus, at lobortis nulla diam vitae dolor. Donec ut dapibus lorem. Mauris non condimentum turpis. Integer lectus elit, ultrices id felis eu, finibus congue augue. Aliquam malesuada ligula quis felis rhoncus, id congue leo euismod.</p>
                        <p>Nullam ex eros, posuere ut hendrerit ut, scelerisque ut libero. Sed vulputate egestas lorem, in ultricies risus semper at. Praesent blandit elementum mi vitae laoreet. Nulla rutrum, mauris sed tincidunt blandit, velit sem finibus mauris, eu consequat orci tellus et ante. Aenean libero est, laoreet vitae ultrices id, auctor quis sapien. Donec auctor luctus leo, id aliquam turpis interdum et. Nullam semper sagittis commodo. In non arcu eu nisl malesuada convallis vel vitae ex. Nam sit amet imperdiet est. Vivamus nec finibus diam. Aliquam vulputate dapibus auctor. Vivamus eu pharetra felis. In sagittis elit et cursus pretium. Sed metus sem, tincidunt vel libero id, fermentum suscipit felis. Morbi blandit mi nec semper malesuada.</p>
                        <p>Etiam lobortis, dolor ac facilisis efficitur, metus leo posuere est, non pharetra orci velit non velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Ut finibus sagittis diam ac feugiat. Curabitur eget venenatis arcu. Ut commodo tempor sollicitudin. Nulla nec congue mauris. Sed cursus interdum arcu. Morbi lacinia lorem ut ante feugiat, eu cursus nisi ultricies.</p>
                    </Col>
                </Row>
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
                                        You are currently logged in at <span className='nhsuk-u-font-weight-bold tl-nhsuk-u-text-uppercase'>Greene's Pharmacy (ods:4ft)</span> with <strong>Health Professional Access Role</strong>.
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
