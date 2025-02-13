import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PageNotFound from "@/app/notfound/page";

import { AuthContext } from "@/context/AuthProvider";

function MockAuthProvider({
    isSignedIn,
    children
}) {
    return (
        <AuthContext.Provider value={{ isSignedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

describe("PageNotFound", () => {
    describe("when user is NOT signed in", () => {
        beforeEach(() => {
            render(
                <MockAuthProvider isSignedIn={false}>
                    <PageNotFound />
                </MockAuthProvider>
            );
        });

        it("renders the main element with the correct id and class", () => {
            const mainElement = screen.getByRole("main");
            expect(mainElement).toHaveAttribute("id", "main-content");
            expect(mainElement).toHaveClass("nhsuk-main-wrapper");
        });

        it("displays the 'Page not found' heading", () => {
            expect(
                screen.getByRole("heading", { name: "Page not found" })
            ).toBeInTheDocument();
        });

        it("displays the instructions to check the web address", () => {
            expect(
                screen.getByText("If you typed the web address, check it was correct.")
            ).toBeInTheDocument();
            expect(
                screen.getByText(
                    "If you pasted the web address, check you copied the entire address"
                )
            ).toBeInTheDocument();
        });

        it("does NOT display the 'search for a prescription' link", () => {
            expect(
                screen.queryByRole("link", { name: /search for a prescription/i })
            ).toBeNull();
        });
    });

    describe("when user IS signed in", () => {
        beforeEach(() => {
            render(
                <MockAuthProvider isSignedIn={true}>
                    <PageNotFound />
                </MockAuthProvider>
            );
        });

        it("displays the 'Page not found' heading", () => {
            expect(
                screen.getByRole("heading", { name: "Page not found" })
            ).toBeInTheDocument();
        });

        it("displays the 'search for a prescription' link", () => {
            const searchLink = screen.getByRole("link", {
                name: /search for a prescription/i,
            });
            expect(searchLink).toBeInTheDocument();
            expect(searchLink).toHaveAttribute("href", "/searchforaprescription");
        });
    });
});
