export const isUserLoggedIn = () => {
  //checks if user is logged in, as this affects redirect from home button
  try {
    const authData = localStorage.getItem("auth")
    if (!authData) return false
    const parsedAuth = JSON.parse(authData)
    return parsedAuth?.isSignedIn === true && parsedAuth?.user !== null
  } catch {
    return false
  }
}

export const getHomeLink = () => {
  return isUserLoggedIn() ? "/search-by-prescription-id" : "/login"
}
