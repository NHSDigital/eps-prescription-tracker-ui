'use client'
import React from "react"
import "../../assets/styles/searchforaprescription.scss"
import { Container, Col, Row, Hero } from "nhsuk-react-components"
import { HERO_TEXT } from "../../constants/ui-strings/SearchForAPrescription"
export default function SearchForAPrescription() {
    return (
        <main className="nhsuk-main-wrapper" data-testid="search-for-a-prescription">
            <Container className="hero-container">
                <Row>
                    <Col width="full">
                    <Hero className="nhsuk-hero-wrapper" data-testid="hero-banner">
                     <Hero.Heading>
                        {HERO_TEXT}
                     </Hero.Heading>
                    </Hero>
                    </Col>
                </Row>
            </Container>
        </main>
    )
}
