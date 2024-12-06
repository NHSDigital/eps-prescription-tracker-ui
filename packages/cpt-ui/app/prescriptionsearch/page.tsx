'use client'
import React from "react";
import { Col, Row } from "nhsuk-react-components";
import "../../assets/styles/prescriptionSearch.scss"
import EpsTabs from "../../components/EpsTabs";

export default function Page() {
    return (
        <main id="prescriptionSearch">
            <Row>
                <Col width="full">
                    <EpsTabs />
                </Col>
            </Row>
        </main>
    )
}
