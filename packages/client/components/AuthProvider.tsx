'use client'

import { Amplify } from 'aws-amplify'
import {
	signInWithRedirect as amplifySignInViaSocial,
	AuthError,
	fetchAuthSession,
	JWT,
} from 'aws-amplify/auth'
import {Hub} from 'aws-amplify/utils'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { initAmplify } from '../utils/amplify-init'

/**
 * * ------------------------------------------------------------------------
 * * MARK: Amplify Initialization
 * * ------------------------------------------------------------------------
 */

initAmplify()

/**
 * * ------------------------------------------------------------------------
 * * MARK: Types
 * * ------------------------------------------------------------------------
 */

/** Supported providers for social sign-in in the app. */
export type AppSocialSignInProviders = 'Auth0'



export enum SignInViaSocialErrors {
	/** Unknown error occured (i.e., error we do not account for). Can also occur if theres no internet connection. */
	unknown = 'unknown',
}

/**
 * * ------------------------------------------------------------------------
 * * MARK: Provider
 * * ------------------------------------------------------------------------
 */

export interface AppUserDetails {
	/** User's ID */
	userId: string
	/** User's email */
	email: string
	/** User's name */
	name: string
	/** URL to user's profile picture */
	picture?: string
	/** Access Token (JWT) */
	accessToken: JWT
	/** idToken (JWT) */
	idToken: JWT
}

export interface AuthContextType {
	/**
	 * Data
	 */

	/** Is there a user currently signed in? */
	isSignedIn: boolean
	/** `AppUserDetails` for currently signed in user. Undefined if no user is signed in. */
	userDetails?: AppUserDetails

	/**
	 * Operations
	 */

	/** Refreshes the user's auth state. */
	refreshAuthState: () => Promise<void>
	/** Sign the user in/up to the app via a social provider. */
	signInViaSocial: (redirectPath: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
	// data
	isSignedIn: false,
	userDetails: undefined,

	// operations
	refreshAuthState: async () => {},
	signInViaSocial: async () => {},
})

interface AuthProviderProps {
	/** Clear the cache of the `AuthProvider` on intialisation? */
	clearCache?: boolean
	/** Provider children */
	children?: ReactNode
}

/**
 * Provides and manages the authentication state of the app.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
	// getting auth state via `useAuthProvider` hook.
	const auth = useAuthProvider()

	// provider
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

/**
 * Hook that provides and manages the authentication state. We define this hook
 * to save defining all of the auth logic inside the `AuthProvider` component.
 */
const useAuthProvider = () => {
	/**
	 * Data
	 */

	// is the user signed in?
	const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
	// details for currently signed in user
	const [userDetails, setUserDetails] = useState<AppUserDetails | undefined>(undefined)

	useEffect(() => {
		const unsubscribe = Hub.listen('auth', async ({payload}) => {
			console.log("in AuthProvider")
			console.log(payload)
		})

		return unsubscribe
	}, [])

	/**
	 * Operations
	 */

	/**
	 * Refresh Auth Context
	 */

	/**
	 * Refreshes the auth context based on the current auth session.
	 *
	 * Should be called whenever the users auth state changes and we need to update
	 * our context - e.g., sign in, sign out, etc.
	 */
	const refreshAuthState = useCallback(async () => {
		// fetching user tokens
		const authSession = await fetchAuthSession()
		const accessToken = authSession.tokens?.accessToken
		const idToken = authSession.tokens?.idToken
		//const userAttributes = idToken && decodeCognitoIdToken(idToken.toString())

		// if user is signed in -> lets update state with user info
		if (accessToken && idToken) {
			setIsSignedIn(true)
			setUserDetails({
				userId: "user id",
				email: "user email",
				name: "user name",
				picture: "user picture",
				accessToken: accessToken,
				idToken: idToken,
			})
		}

		// if user is not signed in -> lets clear the state
		if (!accessToken || !idToken) {
			setIsSignedIn(false)
			setUserDetails(undefined)
		}
	}, [])

	/**
	 * Sign Up
	 */

	/**
	 * Sign in via Social
	 */

	/**
	 * Sign the user in/up to the app via a social provider.
	 *
	 * **NOTE**: This method will re-direct the user to the social provider's login
	 * page, and they will then be send back to the app. You must handle this re-direct
	 * back to the app in order to complete the sign-in/sign-up.
	 */
	const signInViaSocial = async (redirectPath: string) => {
		try {

			// signing in via social
			await amplifySignInViaSocial({
				provider: {
					custom: 'Auth0'
				  },
				customState: JSON.stringify({ redirectPath })
			})
		} catch (e) {
			// cleaning up session storage

			// throwing custom error
			throw new Error(SignInViaSocialErrors.unknown)
		}
	}

	/**
	 * Returning auth state.
	 */

	return {
		// data
		isSignedIn,
		userDetails,

		// operations
		refreshAuthState,
		signInViaSocial,
	}
}

/**
 * * ------------------------------------------------------------------------
 * * MARK: Hooks
 * * ------------------------------------------------------------------------
 */

/**
 * Returns the Auth context for the app.
 */
export const useAuth = () => {
	return useContext(AuthContext)
}
