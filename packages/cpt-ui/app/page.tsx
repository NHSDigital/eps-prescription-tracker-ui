'use client'
import React from "react";

import { Container, Col, Row } from "nhsuk-react-components";

export default function Page() {

    return (
        <main className="nhsuk-main-wrapper">
            <Container>

                <Row>
                    <Col width="full">
                        <h1>Hello World</h1>
                        <p>Etiam lobortis! dolor ac facilisis efficitur, metus leo posuere est, non pharetra orci velit non velit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Ut finibus sagittis diam ac feugiat. Curabitur eget venenatis arcu. Ut commodo tempor sollicitudin. Nulla nec congue mauris. Sed cursus interdum arcu. Morbi lacinia lorem ut ante feugiat, eu cursus nisi ultricies.</p>
                    </Col>
                </Row>
            </Container>
        </main>
    );
}
