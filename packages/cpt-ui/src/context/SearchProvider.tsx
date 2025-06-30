import React, {createContext, useContext, useState} from "react"

export interface SearchParameters {
  prescriptionId?: string
  issueNumber?: string
  firstName?: string
  lastName?: string
  dobDay?: string
  dobMonth?: string
  dobYear?: string
  postcode?: string
  nhsNumber?: string
}

export interface SearchProviderContextType {
  prescriptionId?: string
  issueNumber?: string
  firstName?: string
  lastName?: string
  dobDay?: string
  dobMonth?: string
  dobYear?: string
  postcode?: string
  nhsNumber?: string
  clearSearchParameters: () => void
  setPrescriptionId: (prescriptionId: string | undefined) => void
  setIssueNumber: (issueNumber: string | undefined) => void
  setFirstName: (firstName: string | undefined) => void
  setLastName: (lastName: string | undefined) => void
  setDobDay: (dobDay: string | undefined) => void
  setDobMonth: (dobMonth: string | undefined) => void
  setDobYear: (dobYear: string | undefined) => void
  setPostcode: (postCode: string | undefined) => void
  setNhsNumber: (nhsNumber: string | undefined) => void
  getAllSearchParameters: () => SearchParameters
  setAllSearchParameters: (searchParameters: SearchParameters) => void
}

export const SearchContext = createContext<SearchProviderContextType | null>(null)

export const SearchProvider = ({children}: { children: React.ReactNode }) => {
  const [prescriptionId, setPrescriptionId] = useState<string | undefined>(undefined)
  const [issueNumber, setIssueNumber] = useState<string | undefined>(undefined)
  const [firstName, setFirstName] = useState<string | undefined>(undefined)
  const [lastName, setLastName] = useState<string | undefined>(undefined)
  const [dobDay, setDobDay] = useState<string | undefined>(undefined)
  const [dobMonth, setDobMonth] = useState<string | undefined>(undefined)
  const [dobYear, setDobYear] = useState<string | undefined>(undefined)
  const [postcode, setPostcode] = useState<string | undefined>(undefined)
  const [nhsNumber, setNhsNumber] = useState<string | undefined>(undefined)

  const clearSearchParameters = () => {
    setPrescriptionId(undefined)
    setIssueNumber(undefined)
    setFirstName(undefined)
    setLastName(undefined)
    setDobDay(undefined)
    setDobMonth(undefined)
    setDobYear(undefined)
    setPostcode(undefined)
    setNhsNumber(undefined)
  }

  const setAllSearchParameters = (searchParameters: SearchParameters) => {
    setPrescriptionId(searchParameters.prescriptionId)
    setIssueNumber(searchParameters.issueNumber)
    setFirstName(searchParameters.firstName)
    setLastName(searchParameters.lastName)
    setDobDay(searchParameters.dobDay)
    setDobMonth(searchParameters.dobMonth)
    setDobYear(searchParameters.dobYear)
    setPostcode(searchParameters.postcode)
    setNhsNumber(searchParameters.nhsNumber)
  }

  const getAllSearchParameters = () => {
    return {
      prescriptionId,
      issueNumber,
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode,
      nhsNumber
    }
  }
  return (
    <SearchContext.Provider value={{
      prescriptionId,
      issueNumber,
      firstName,
      lastName,
      dobDay,
      dobMonth,
      dobYear,
      postcode,
      nhsNumber,
      clearSearchParameters,
      setPrescriptionId,
      setIssueNumber,
      setFirstName,
      setLastName,
      setDobDay,
      setDobMonth,
      setDobYear,
      setPostcode,
      setNhsNumber,
      getAllSearchParameters,
      setAllSearchParameters
    }}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearchContext = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error("useSearchContext must be used within an SearchProvider")
  }
  return context
}
