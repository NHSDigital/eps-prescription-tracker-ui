'use client'
import React from "react"

import {Container, Col, Row} from "nhsuk-react-components"
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
                    </Container>
                </Row>
            </Container>
        </main>
    )
}
