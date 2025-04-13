import React, {useEffect, useState} from 'react'
import {Hub} from "aws-amplify/utils"
import {signInWithRedirect, signOut, getCurrentUser, fetchAuthSession, JWT} from "aws-amplify/auth"
import {Amplify} from "aws-amplify"
import axios from "axios"
import './interceptors'

import './App.css'
import {authConfig} from './configureAmplify'
Amplify.configure(authConfig, {ssr: true})

const prescriptionDetailsEndpoint = "/api/prescription-details"
const trackerUserInfoEndpoint = "/api/tracker-user-info"

const API_ENDPOINT = '/api/prescription-list'

function App() {
  const [user, setUser] = useState(null)
  const [, setError] = useState(null)
  const [, setCustomState] = useState(null)
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
  const [idToken, setIdToken] = useState<JWT>(null)
  const [accessToken, setAccessToken] = useState<JWT>(null)
  const [prescriptionId, setPrescriptionId] = useState<string>('')
  const [nhsNumber, setNhsNumber] = useState<number>(0)
  const [prescriptionData, setPrescriptionData] = useState<any>(null)
  const [prescriptionDetails, setPrescriptionDetails] = useState<any>(null)
  const [trackerUserInfoData, setTrackerUserInfoData] = useState<JWT>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      console.log("in auth listen")
      console.log(payload)
      switch (payload.event) {
        case "signInWithRedirect":
          getUser()
          break
        case "signInWithRedirect_failure":
          setError("An error has occurred during the OAuth flow.")
          break
        case "customOAuthState":
          setCustomState(payload.data) // this is the customState provided on signInWithRedirect function
          break
      }
    })

    getUser()

    return unsubscribe
  }, [])

  const getUser = async () => {
    try {
      const authSession = await fetchAuthSession({ forceRefresh: true })
      const accessToken = authSession.tokens?.accessToken
      const idToken = authSession.tokens?.idToken

      if (accessToken && idToken) {
        console.log(idToken.payload)
        setAccessToken(accessToken)
        setIdToken(idToken)
        setIsSignedIn(true)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      }
      else {
        setIsSignedIn(false)
      }
    } catch (error) {
      console.error(error)
      console.log("Not signed in")
    }
  }

  const fetchPrescriptionData = async ({ nhsNumber, prescriptionId }: { nhsNumber?: number, prescriptionId?: string }) => {
    if (!prescriptionId && !nhsNumber) {
      setError("Please provide either a Prescription ID or an NHS Number.");
      return;
    }

    setLoading(true)
    setPrescriptionData(null)
    setError(null)

    try {
      // Call the backend to fetch prescription data
      const prescriptionResponse = await axios.get(API_ENDPOINT, {
        params: {
          prescriptionId, nhsNumber
        },
        headers: {
          /**
           * Provide the Cognito id token:
           * - This token is issued by AWS Cognito and is used to authenticate the request.
           * - The backend uses this token to identify the user and securely manage CIS2/Apigee tokens.
           */
          Authorization: `Bearer ${idToken}`,
          /**
           * Include the hardcoded role ID in the NHSD-Session-URID header:
           * - This is required for the CPT API to handle the request correctly.
           */
          "NHSD-Session-URID": "555254242106"
        }
      })

      // Update the frontend state with the fetched prescription data
      setPrescriptionData(prescriptionResponse.data)
    } catch (err) {
      // Handle and log any errors during the API call
      setError("Failed to fetch prescription data.")
      console.error("Error fetching data:", err)
    } finally {
      // Ensure the loading state is updated regardless of success or failure
      setLoading(false)
    }
  }

  const retrievePrescriptionDetails = async () => {
    if (!prescriptionId) {
      setError("Please enter a Prescription ID.")
      return
    }

    setLoading(true)
    setPrescriptionDetails(null)
    setError(null)

    try {
      // Construct the request URL with prescriptionId
      const requestUrl = `${prescriptionDetailsEndpoint}/${prescriptionId}`

      // Call the backend to retrieve prescription details
      const prescriptionResponse = await axios.get(requestUrl, {
        headers: {
          /**
           * Provide the Cognito id token:
           * - This token is issued by AWS Cognito and is used to authenticate the request.
           * - The backend uses this token to identify the user and securely manage CIS2/Apigee tokens.
           */
          Authorization: `Bearer ${idToken}`,
          /**
           * Include the hardcoded role ID in the NHSD-Session-URID header:
           * - This is required for the CPT API to handle the request correctly.
           */
          "NHSD-Session-URID": "555254242106"
        }
      })

      // Update the frontend state with the retrieved prescription details
      setPrescriptionDetails(prescriptionResponse.data)
    } catch (err) {
      // Handle and log any errors during the API call
      setError("Failed to retrieve prescription details.")
      console.error("Error retrieving prescription details:", err)
    } finally {
      // Ensure the loading state is updated regardless of success or failure
      setLoading(false)
    }
  }

  const fetchTrackerUserInfo = async (isMock: boolean) => {
    setLoading(true)
    setTrackerUserInfoData(null)
    setError(null)

    try {
      const response = await axios.get(trackerUserInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'NHSD-Session-URID': '555254242106'
        }
      })
      setTrackerUserInfoData(response.data)
    } catch (err) {
      setError("Failed to fetch tracker user info")
      console.error("error fetching tracker user info:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <button onClick={() => signInWithRedirect({
        provider: {
          custom: "Primary"  // This is the name of the AWS::Cognito::UserPoolIdentityProvider we are using to sign in
        }
      })}>Log in with PTL CIS2</button>
      <button onClick={() => signInWithRedirect({
        provider: {
          custom: "Mock"  // This is the name of the AWS::Cognito::UserPoolIdentityProvider we are using to sign in
        }
      })}>Log in with mock CIS2</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <div>username: {user?.username}</div>
      <div>isSignedIn: {isSignedIn.toString()}</div>
      <div>idToken: {idToken?.toString()}</div>
      <div>accessToken: {accessToken?.toString()}</div>

      <div style={{ marginTop: '20px' }}>
        <label htmlFor="prescriptionId">Prescription ID:</label>
        <input
          type="text"
          id="prescriptionId"
          value={prescriptionId}
          onChange={(e) => setPrescriptionId(e.target.value)}
          placeholder="Enter Prescription ID"
        />
        <button
          onClick={() => fetchPrescriptionData({ prescriptionId })}
          disabled={!isSignedIn || !prescriptionId}
        >
          Search for a prescription
        </button>
        <button
          onClick={retrievePrescriptionDetails}
          disabled={!isSignedIn || !prescriptionId}
        >
          Retrieve prescription details
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label htmlFor="nhsNumber">NHS Number:</label>
        <input
          type="number"
          id="nhsNumber"
          value={nhsNumber}
          onChange={(e) => setNhsNumber(Number(e.target.value))}
          placeholder="Enter Prescription ID"
        />
        <button
          onClick={() => fetchPrescriptionData({ nhsNumber })}
          disabled={!isSignedIn || !nhsNumber}
        >
          Fetch Prescription Data
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => fetchTrackerUserInfo(false)} disabled={!isSignedIn}>
          Fetch Tracker User Info
        </button>
      </div>
      {loading && <p>Loading...</p>}

      {prescriptionData && (
        <div style={{marginTop: '20px'}}>
          <h3>Prescription Data:</h3>
          <pre>{JSON.stringify(prescriptionData, null, 2)}</pre>
        </div>
      )}

      {prescriptionDetails && (
        <div style={{marginTop: '20px'}}>
          <h3>Prescription Details:</h3>
          <pre>{JSON.stringify(prescriptionDetails, null, 2)}</pre>
        </div>
      )}

      {trackerUserInfoData && (
        <div style={{marginTop: '20px'}}>
          <h3>Tracker User Info Data:</h3>
          <pre>{JSON.stringify(trackerUserInfoData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App
