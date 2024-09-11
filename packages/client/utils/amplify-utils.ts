import {cookies} from "next/headers"

import {createServerRunner} from "@aws-amplify/adapter-nextjs"
import {fetchAuthSession, getCurrentUser} from "aws-amplify/auth"
import outputs from "../amplify_outputs.json"
import {Amplify} from "aws-amplify"

export const {runWithAmplifyServerContext} = createServerRunner({
  config: outputs
})

export async function AuthGetCurrentUserServer() {
  try {
    Amplify.configure(outputs, {ssr: true})
    const currentUser = await getCurrentUser()
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.payload
    return {currentUser, idToken}
  } catch (error) {
    console.error(error)
  }
}
