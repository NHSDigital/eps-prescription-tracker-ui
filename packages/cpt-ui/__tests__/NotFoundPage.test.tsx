import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import React from 'react'
import NotFoundPage from '@/pages/NotFoundPage'

describe('NotFoundPage', () => {
    it('renders the main element with the correct id', () => {
        render(<NotFoundPage />)
        const mainElement = screen.getByRole('main')
        expect(mainElement).toHaveAttribute('id', 'main-content')
    })

    it('renders the heading "Page not found"', () => {
        render(<NotFoundPage />)
        const heading = screen.getByRole('heading', { name: /page not found/i })
        expect(heading).toBeInTheDocument()
    })

    it('renders the instruction paragraphs', () => {
        render(<NotFoundPage />)
        expect(
            screen.getByText(/if you typed the web address, check it was correct/i)
        ).toBeInTheDocument()
        expect(
            screen.getByText(/if you pasted the web address, check you copied the entire address/i)
        ).toBeInTheDocument()
    })

    it('renders a link to search for a prescription with the correct href', () => {
        render(<NotFoundPage />)
        const link = screen.getByRole('link', { name: /search for a prescription/i })
        expect(link).toHaveAttribute('href', '/site/searchforaprescription')
    })
})
