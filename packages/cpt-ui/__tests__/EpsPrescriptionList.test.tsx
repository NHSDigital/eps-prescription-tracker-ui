import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PRESCRIPTION_LIST_PAGE_STRINGS } from "@/constants/ui-strings/PrescriptionListPageStrings";


jest.mock("@/context/AccessProvider", () => {
    const React = require("react");
    const AccessContext = React.createContext({
        patientDetails: null,
        setPatientDetails: () => { },
    });

    // A provider that uses state to allow updating patientDetails (for later)
    const MockAccessProvider = (children: React.ReactElement) => {
        const [patientDetails, setPatientDetails] = React.useState(null);
        const value = { patientDetails, setPatientDetails };
        return (
            <AccessContext.Provider value={value}>
                {children}
            </AccessContext.Provider>
        );
    };

    const useAccess = () => React.useContext(AccessContext);

    return {
        AccessContext,
        MockAccessProvider,
        useAccess,
    };
});

import PrescriptionListPage from "@/pages/PrescriptionListPage";

const renderWithRouter = (route: string) => {
    const { MockAccessProvider } = require("@/context/AccessProvider");
    return render(
        <MockAccessProvider>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path="*" element={<PrescriptionListPage />} />
                </Routes>
            </MemoryRouter>
        </MockAccessProvider>
    );
};

describe("PrescriptionListPage", () => {
    it("renders the component with the correct title and heading", () => {
        renderWithRouter("/prescription-results");

        const heading = screen.getByTestId("prescription-list-heading");
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(PRESCRIPTION_LIST_PAGE_STRINGS.HEADING);

        const resultsHeading = screen.getByTestId("results-heading");
        expect(resultsHeading).toBeInTheDocument();

        // Check that the component renders the prescription results list container
        const resultsListContainer = screen.getByTestId("prescription-results-list");
        expect(resultsListContainer).toBeInTheDocument();
    });

    it("shows the correct number of results", () => {
        renderWithRouter("/prescription-results");

        const resultsCount = screen.getByTestId("results-count");
        expect(resultsCount).toHaveTextContent(`${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_PREFIX}5${PRESCRIPTION_LIST_PAGE_STRINGS.RESULTS_SUFFIX}`);
    });

    it("sets the back link to the default target when no query parameters are present", () => {
        renderWithRouter("/prescription-results");

        // Now checking the link-container which has the href attribute
        const linkContainer = screen.getByTestId("back-link-container");
        expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.DEFAULT_BACK_LINK_TARGET);
    });

    it("sets the back link to the prescription ID search when prescriptionId query parameter is present", async () => {
        renderWithRouter("/prescription-results?prescriptionId=123456");

        // We need to wait for the useEffect to run
        await waitFor(() => {
            const linkContainer = screen.getByTestId("back-link-container");
            expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.PRESCRIPTION_ID_SEARCH_TARGET);
        });
    });

    it("sets the back link to the NHS number search when nhsNumber query parameter is present", async () => {
        renderWithRouter("/prescription-results?nhsNumber=1234567890");

        // We need to wait for the useEffect to run
        await waitFor(() => {
            const linkContainer = screen.getByTestId("back-link-container");
            expect(linkContainer).toHaveAttribute("href", PRESCRIPTION_LIST_PAGE_STRINGS.NHS_NUMBER_SEARCH_TARGET);
        });
    });

});
