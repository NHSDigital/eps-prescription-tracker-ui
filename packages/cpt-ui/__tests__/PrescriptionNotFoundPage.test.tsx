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

describe('PrescriptionNotFoundPage - searchType parameter behavior', () => {
    it('should append hash to the backLink URL when searchType is provided', () => {
        render(
            <MemoryRouter initialEntries={['/notfound?searchType=example']}>
                <PrescriptionNotFoundPage />
            </MemoryRouter>
        )
        const link = screen.getByTestId('presc-not-found-backlink')
        // The rendered link might have a full URL like "http://localhost/search#example"
        expect(link.getAttribute('href')).toContain('/search#example')
    })

    it('should not append a hash to the backLink URL when searchType is not provided', () => {
        render(
            <MemoryRouter initialEntries={['/notfound']}>
                <PrescriptionNotFoundPage />
            </MemoryRouter>
        )
        const link = screen.getByTestId('presc-not-found-backlink')
        expect(link.getAttribute('href')).toContain('/search')
        // Ensure that no hash is appended when searchType is absent.
        expect(link.getAttribute('href')).not.toContain('#')
    })
})
