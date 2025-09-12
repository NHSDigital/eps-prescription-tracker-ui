import {AuthContextType} from "@/context/AuthProvider"

/*
** Universal sign out helper functions
** Used on the LogoutPage & SessionLoggedOutPage for a consistent sign out process
*/

export const signOut = async (auth: AuthContextType) => {
    const result = await auth?.cognitoSignOut()
    if (!result) {
      auth.clearAuthState()
    }
}
