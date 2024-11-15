import React, {useEffect, useState} from 'react'
import {Hub} from "aws-amplify/utils"
import {signInWithRedirect, signOut, getCurrentUser, fetchAuthSession, JWT} from "aws-amplify/auth"
import {Amplify} from "aws-amplify"
import axios from 'axios'

import './App.css'
import {authConfig} from './configureAmplify'
Amplify.configure(authConfig, {ssr: true})

const API_ENDPOINT = '/api/tracker-user-info'

function App() {
  const [user, setUser] = useState(null)
  const [, setError] = useState(null)
  const [, setCustomState] = useState(null)
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
  const [idToken, setIdToken] = useState<JWT>(null)
  const [accessToken, setAccessToken] = useState<JWT>(null)
  const [trackerUserInfoData, setTrackerUserInfoData] = useState<any>(null)
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

  const fetchTrackerUserInfo = async () => {
    console.log("Requesting tracker user info")
    if (!accessToken) {
      setError('User is not logged in')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(API_ENDPOINT, {
        params: {},
        headers: {
          Authorization: `Bearer ${idToken}`,
          'NHSD-Session-URID': '555254242106',
          'Cookie': ""
        },
        withCredentials: false
      })
      setTrackerUserInfoData(response.data)
    } catch (err) {
      setError('Failed to fetch tracker user info.')
      console.error('Failed to fetch tracker user info:', err)
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
      <div>isSignedIn: {isSignedIn} </div>
      <div>idToken: {idToken?.toString()}</div>
      <div>accessToken: {accessToken?.toString()}</div>

      <div style={{marginTop: '20px'}}>
        <button
          onClick={fetchTrackerUserInfo}
          disabled={!isSignedIn}
        >
          Fetch User Information
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {trackerUserInfoData && (
        <div style={{marginTop: '20px'}}>
          <h3>Prescription Data:</h3>
          <pre>{JSON.stringify(trackerUserInfoData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App

curl 'https://cpt-ui-pr-173.dev.eps.national.nhs.uk/api/tracker-user-info' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer eyJraWQiOiJUVGRHSFwvb3ZpTWVyUkFFeGJcL0VsZUxoUDlybUFSQzNXM1dpMlB2aDFrUFE9IiwiYWxnIjoiUlMyNTYifQ.eyJhdF9oYXNoIjoiYTVVTDQwVzA2eVNFSXlCQWU2cGQ5dyIsInN1YiI6ImI2NDI2MmM0LWYwYTEtNzA4Zi02YzNmLWU0NDc4MDhmNDUwZSIsImNvZ25pdG86Z3JvdXBzIjpbImV1LXdlc3QtMl9GZndhRUlGSzNfTW9jayJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtd2VzdC0yLmFtYXpvbmF3cy5jb21cL2V1LXdlc3QtMl9GZndhRUlGSzMiLCJjb2duaXRvOnVzZXJuYW1lIjoiTW9ja181NTUwODY2ODkxMDYiLCJvcmlnaW5fanRpIjoiYzgyMWFkNGUtY2M2YS00NmNlLTgzOTQtODgwYmQ3MDBlMDg2IiwiYXVkIjoiMjEwc3Fvc2M1ZGp1N2plMWs5dGRydmlnc20iLCJpZGVudGl0aWVzIjpbeyJkYXRlQ3JlYXRlZCI6IjE3MzE2NzcyNDU3OTYiLCJ1c2VySWQiOiI1NTUwODY2ODkxMDYiLCJwcm92aWRlck5hbWUiOiJNb2NrIiwicHJvdmlkZXJUeXBlIjoiT0lEQyIsImlzc3VlciI6bnVsbCwicHJpbWFyeSI6InRydWUifV0sInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzMxNjgzMzE3LCJleHAiOjE3MzE2ODY5MTcsImlhdCI6MTczMTY4MzMxNywianRpIjoiMmZhNDEwOTktNDBjOC00OGJhLThhZTItNzQ0NmE2MjhkZWQxIn0.EqOo3s117dhbLpa2aspCRoLAJqT9Ayz5lnDckgnHhQV2TM6bici0yWu78OAryhWL8z9G37V9_rDldPw5a4MjShIJt7Q1tW75sCGrgmBTAGylqByivsuuQ2XHAjUNQ-RmGuTn-WKscryxpKigWRay0iBWBCOwfD92AbZ3WkCSxfsDoQfezhXRJtin2HPmCEy19X_bMtkUKioyiCM4I02VKfOp2nEKGyBumet9z3BBIQ4iUFebuY3wYU-mimYev7ENu_4fSETPq3Z9SM71UdxnDBctH5bpyIh8G_AE4NEWRE0eSZ6vX8YxbKY7jJ7fdPZl9cOg-V73jinPcImnM9EEmw' \
  -H 'cookie: ' \
  -H 'nhsd-session-urid: 555254242106' \
  -H 'priority: u=1, i' \
  -H 'referer: https://cpt-ui-pr-173.dev.eps.national.nhs.uk/auth_demo/' \
  -H 'sec-ch-ua: "Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
