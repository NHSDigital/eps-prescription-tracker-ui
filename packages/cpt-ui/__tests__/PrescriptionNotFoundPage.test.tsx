import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrescriptionNotFoundPage from '@/pages/PrescriptionNotFoundPage'
import { PRESCRIPTION_NOT_FOUND_STRINGS } from '@/constants/ui-strings/PrescriptionNotFoundPageStrings'

describe('PrescriptionNotFoundPage', () => {
    beforeEach(() => {
        render(
            <MemoryRouter>
                <PrescriptionNotFoundPage />
            </MemoryRouter>
        )
    })

    it('renders the main container with the correct id and class', () => {
        // The <main> element has an implicit role of "main"
        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
        expect(mainElement).toHaveAttribute('id', 'main-content')
        expect(mainElement).toHaveClass('nhsuk-main-wrapper')
    })

    it('renders the proper elements', () => {
        const header = screen.getByTestId('presc-not-found-header')
        const body = screen.getByTestId('presc-not-found-body1')
        const link = screen.getByTestId('presc-not-found-backlink')

        expect(header).toHaveTextContent(PRESCRIPTION_NOT_FOUND_STRINGS.headerText)
        expect(body).toHaveTextContent(PRESCRIPTION_NOT_FOUND_STRINGS.body1)
        expect(link).toHaveTextContent(PRESCRIPTION_NOT_FOUND_STRINGS.backLinkText)
    })
})
