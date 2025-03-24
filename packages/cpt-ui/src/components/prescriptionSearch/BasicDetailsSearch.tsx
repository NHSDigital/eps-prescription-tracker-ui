import React from 'react';

// TODO:
// When this search does not return a prescription (either invalid, or non-existent), redirect to 
// /prescription-not-found
// That page takes a query string, which is set to the original search tab label. In this case,
// be sure to redirect the user to prescription-not-found?searchType=BasicDetailsSearch
export default function BasicDetailsSearch() {
    return (
        <h1 data-testid="basic-details-search-heading">Basic Details Search</h1>
    )
}
