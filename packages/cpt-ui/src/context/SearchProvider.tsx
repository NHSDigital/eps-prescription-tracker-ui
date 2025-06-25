import React, {createContext, useContext, useState} from "react"

export interface SearchProviderContextType {
  prescriptionId: string | null
  issueNumber: string | undefined
  firstName: string | null
  lastName: string | null
  dobDay: string | null
  dobMonth: string | null
  dobYear: string | null
  postcode: string | null
  nhsNumber: string | null
  clearSearchParameters: () => void
  setPrescriptionId: (prescriptionId: string) => void
  setIssueNumber: (issueNumber: string | undefined) => void
  setFirstName: (firstName: string) => void
  setLastName: (lastName: string) => void
  setDobDay: (dobDay: string) => void
  setDobMonth: (dobMonth: string) => void
  setDobYear: (dobYear: string) => void
  setPostcode: (postCode: string) => void
  setNhsNumber: (nhsNumber: string) => void
}

export const SearchContext = createContext<SearchProviderContextType | null>(null)

export const SearchProvider = ({children}: { children: React.ReactNode }) => {
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [issueNumber, setIssueNumber] = useState<string | undefined>(undefined)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [lastName, setLastName] = useState<string | null>(null)
  const [dobDay, setDobDay] = useState<string | null>(null)
  const [dobMonth, setDobMonth] = useState<string | null>(null)
  const [dobYear, setDobYear] = useState<string | null>(null)
  const [postcode, setPostcode] = useState<string | null>(null)
  const [nhsNumber, setNhsNumber] = useState<string | null>(null)

  const clearSearchParameters = () => {
    setPrescriptionId(null)
    setIssueNumber(undefined)
    setFirstName(null)
    setLastName(null)
    setDobDay(null)
    setDobMonth(null)
    setDobYear(null)
    setPostcode(null)
    setNhsNumber(null)
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
      setNhsNumber
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
