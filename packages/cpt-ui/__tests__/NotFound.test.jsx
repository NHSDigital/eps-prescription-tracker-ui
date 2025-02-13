import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import PageNotFound from '@/app/notfound/page'

// Mock next/link to render a simple <a> tag
jest.mock('next/link', () => {
    return ({ href, children }) => <a href={href}>{children}</a>;
})

describe('PageNotFound', () => {
    it('renders the main element with the correct id', () => {
        render(<PageNotFound />)
        const mainElement = screen.getByRole('main')
        expect(mainElement).toHaveAttribute('id', 'main-content')
    })

    it('renders the heading "Page not found"', () => {
        render(<PageNotFound />)
        const heading = screen.getByRole('heading', { name: /page not found/i })
        expect(heading).toBeInTheDocument()
    })

    it('renders the instruction paragraphs', () => {
        render(<PageNotFound />)
        expect(
            screen.getByText(/if you typed the web address, check it was correct/i)
        ).toBeInTheDocument()
        expect(
            screen.getByText(/if you pasted the web address, check you copied the entire address/i)
        ).toBeInTheDocument()
    })

    it('renders a link to search for a prescription with the correct href', () => {
        render(<PageNotFound />)
        const link = screen.getByRole('link', { name: /search for a prescription/i })
        expect(link).toHaveAttribute('href', '/searchforaprescription')
    })
})
