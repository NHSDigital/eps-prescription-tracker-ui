import React from "react"
import {useLocation} from "react-router-dom"
import SearchResultsTooManyMessage from "@/components/SearchResultsTooManyMessage"

export default function TooManySearchResultsPage() {
  const location = useLocation()

  return <SearchResultsTooManyMessage search={location.search} />
}
