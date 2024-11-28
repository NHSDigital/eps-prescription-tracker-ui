import React, {useEffect, useState} from "react"
import {Hub} from "aws-amplify/utils"
import {signInWithRedirect, signOut, getCurrentUser, fetchAuthSession, JWT} from "aws-amplify/auth"
import {Amplify} from "aws-amplify"
import axios from 'axios'
import './interceptors'

import './App.css'
import {authConfig} from './configureAmplify'
Amplify.configure(authConfig, {ssr: true})

const API_ENDPOINT = '/api/prescription-search'

function App() {
  const [user, setUser] = useState(null)
  const [, setError] = useState(null)
  const [, setCustomState] = useState(null)
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
  const [idToken, setIdToken] = useState<JWT>(null)
  const [accessToken, setAccessToken] = useState<JWT>(null)
  const [prescriptionId, setPrescriptionId] = useState<string>('')
  const [prescriptionData, setPrescriptionData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const unsubscribe = Hub.listen("auth", ({payload}) => {
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
      const authSession = await fetchAuthSession({forceRefresh: true})
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
  const fetchPrescriptionData = async () => {
    if (!prescriptionId) {
      setError("Please enter a Prescription ID.")
      return
    }

    setLoading(true)
    setPrescriptionData(null)
    setError(null)

    try {
      // Call /prescription-search endpoint
      const prescriptionResponse = await axios.get(API_ENDPOINT, {
        params: {prescriptionId},
        headers: {
          /**
           * Provide the Cognito access token:
           * The backend requires the Cognito access token in the `Authorization` header to authenticate the request.
           * - This access token is issued to the logged-in user by AWS Cognito.
           * - It is used by the backend to identify the user making the request.
           * - The backend uses this token to retrieve the user's `CIS2_accessToken` from DynamoDB
           *   and, if necessary, exchange it for an `Apigee_accessToken`.
           * - The retrieved or exchanged token is then used to make the CPT API call.
           */
          Authorization: `Bearer ${accessToken}`,
          /**
           * Include the hardcoded role ID in the `NHSD-Session-URID` header:
           * - The backend forwards this header to the CPT API, ensuring the request includes the correct role context.
           * - This role ID is essential for the CPT API to process the request appropriately.
           */
          "NHSD-Session-URID": "555254242106"
        },
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
      <div>isSignedIn: {isSignedIn.toString()} </div>
      <div>idToken: {idToken?.toString()}</div>
      <div>accessToken: {accessToken?.toString()}</div>

      <div style={{marginTop: '20px'}}>
        <label htmlFor="prescriptionId">Prescription ID:</label>
        <input
          type="text"
          id="prescriptionId"
          value={prescriptionId}
          onChange={(e) => setPrescriptionId(e.target.value)}
          placeholder="Enter Prescription ID"
        />
        <button
          onClick={fetchPrescriptionData}
          disabled={!isSignedIn || !prescriptionId}
        >
          Fetch Prescription Data
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {prescriptionData && (
        <div style={{marginTop: '20px'}}>
          <h3>Prescription Data:</h3>
          <pre>{JSON.stringify(prescriptionData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App
