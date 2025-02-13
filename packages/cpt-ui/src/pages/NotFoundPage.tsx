'use client'
import { Link } from "react-router-dom"
import { Container } from "nhsuk-react-components"

import { NOT_FOUND_PAGE_STRINGS } from "@/constants/ui-strings/NotFoundPage"
import { useEffect, useState } from "react"

export default function NotFoundPage() {
    const [headerText, setHeaderText] = useState("")
    const [body1, setBody1] = useState("")
    const [body2, setBody2] = useState("")
    const [body3, setBody3] = useState("")
    const [body3Link, setBody3Link] = useState("")

    useEffect(() => {
        setHeaderText(NOT_FOUND_PAGE_STRINGS.headerText)
        setBody1(NOT_FOUND_PAGE_STRINGS.bodyText1)
        setBody2(NOT_FOUND_PAGE_STRINGS.bodyText2)
        setBody3(NOT_FOUND_PAGE_STRINGS.bodyText3)
        setBody3Link(NOT_FOUND_PAGE_STRINGS.bodyText3LinkText)
    }, [NOT_FOUND_PAGE_STRINGS])

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container>
                <h1 data-testid="eps-404-header">{headerText}</h1>
                <p data-testid="eps-404-body1">{body1}</p>
                <p data-testid="eps-404-body2">{body2}</p>
                <p data-testid="eps-404-body3">{body3}<Link to="/searchforaprescription">{body3Link}</Link></p>
            </Container>
        </main>
    )
}
