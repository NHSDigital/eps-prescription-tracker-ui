import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

import { useLocalStorageState } from '@/helpers/useLocalStorageState'
import { AuthContext } from './AuthProvider'

import { RoleDetails, TrackerUserInfo, UserDetails } from '@/types/TrackerUserInfoTypes'

const trackerUserInfoEndpoint = "/api/tracker-user-info"

export type AccessContextType = {
  noAccess: boolean
  setNoAccess: (value: boolean) => void
  singleAccess: boolean
  setSingleAccess: (value: boolean) => void
  selectedRole: RoleDetails | undefined
  setSelectedRole: (value: RoleDetails | undefined) => void
  userDetails: UserDetails | undefined
  setUserDetails: (value: UserDetails | undefined) => void
  clear: () => void
}

export const AccessContext = createContext<AccessContextType | undefined>(undefined)

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const [noAccess, setNoAccess] = useLocalStorageState<boolean>('noAccess', 'access', false);
  const [singleAccess, setSingleAccess] = useLocalStorageState<boolean>('singleAccess', 'access', false);
  const [selectedRole, setSelectedRole] = useLocalStorageState<RoleDetails | undefined>('selectedRole', 'access', undefined);
  const [userDetails, setUserDetails] = useLocalStorageState<UserDetails | undefined>('userDetails', 'access', undefined)
  const [usingLocal, setUsingLocal] = useState(true);

  const auth = useContext(AuthContext);

  const clear = () => {
    console.warn("Clearing access context.")
    setNoAccess(false);
    setSingleAccess(false);
    setSelectedRole(undefined);
    setUserDetails(undefined);
  }


  type FetchRolesResult = {
    rolesWithAccessCount: number;
    currentlySelectedRole: RoleDetails | undefined;
    userDetails: UserDetails
  };

  const fetchRolesWithAccessAndSelectedRole = async (): Promise<FetchRolesResult> => {
    return fetch(trackerUserInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${auth?.idToken}`,
        'NHSD-Session-URID': '555254242106',
      },
    })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(
            `Server did not return CPT user info, response ${response.status}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!data.userInfo) {
          throw new Error("Server response did not contain data");
        }

        const userInfo: TrackerUserInfo = data.userInfo;
        const rolesWithAccessCount = userInfo.roles_with_access.length;
        const currentlySelectedRole = userInfo.currently_selected_role;
        const userDetails = userInfo.user_details

        return { rolesWithAccessCount, currentlySelectedRole, userDetails };
      });
  };

  // The access variables are cached, and the values are initially assumed to have not changed.
  // On a full page reload, make a tracker use info call to update them from the backend
  useEffect(() => {
    const updateAccessVariables = async () => {
      try {
        const { rolesWithAccessCount, currentlySelectedRole, userDetails } = await fetchRolesWithAccessAndSelectedRole();
        setSelectedRole(currentlySelectedRole);
        setUserDetails(userDetails);

        setNoAccess(rolesWithAccessCount === 0);
        setSingleAccess(rolesWithAccessCount === 1);
      } catch (error) {
        console.error("Access provider failed to fetch roles with access:", error);
      }
    };

    if (!usingLocal) {
      return;
    }

    console.log("Access context detected a page load, and we are using local storage fallback. Updating from backend...")

    if (!auth?.isSignedIn || !auth?.idToken) {
      return;
    }
    // Now that we know there is an id token, check that it has a toString property.
    // For some reason, it doesn't have this immediately, it gets added after a brief pause.
    if (!auth?.idToken.hasOwnProperty('toString')) {
      return;
    }

    updateAccessVariables();
    setUsingLocal(false)
  }, [auth?.idToken]); // run ONLY ONCE on mount (i.e. on initial page load)


  return (
    <AccessContext.Provider value={{ noAccess, setNoAccess, singleAccess, setSingleAccess, selectedRole, setSelectedRole, userDetails, setUserDetails, clear }}>
      {children}
    </AccessContext.Provider>
  )
}

export const useAccess = () => {
  const context = useContext(AccessContext)
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider')
  }
  return context
}
