import {AuthContextType} from "@/context/AuthProvider"

/*
** Universal sign out helper functions
** Used on the LogoutPage & SessionLoggedOutPage for a consistent sign out process
*/

export const signOut = async (auth: AuthContextType) => {
  await auth?.cognitoSignOut()
  // Allow status hub to handle clearing of auth state
}
