'use client'
import { useContext } from "react";
import Link from "next/link";
import { Container } from "nhsuk-react-components";

import { AuthContext } from "@/context/AuthProvider";

export default function PageNotFound() {
    const auth = useContext(AuthContext)

    return (
        <main id="main-content" className="nhsuk-main-wrapper">
            <Container>
                <h1>Page not found</h1>
                <p>If you typed the web address, check it was correct.</p>
                <p>If you pasted the web address, check you copied the entire address</p>
                {auth?.isSignedIn && (
                    <p>Alternatively, you can <Link href="/searchforaprescription">search for a prescription</Link></p>
                )}
            </Container>
        </main>
    )
}
