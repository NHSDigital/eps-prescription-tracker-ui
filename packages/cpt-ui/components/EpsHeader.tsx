"use client"
import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import "@/assets/styles/header.scss";
import { useRouter, usePathname } from "next/navigation";
import { Header } from "nhsuk-react-components";
import {
  HEADER_SERVICE,
  HEADER_CONFIRM_ROLE_BUTTON,
  HEADER_CONFIRM_ROLE_TARGET,
  HEADER_CHANGE_ROLE_BUTTON,
  HEADER_CHANGE_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_TARGET,
  HEADER_SELECT_YOUR_ROLE_BUTTON
} from "@/constants/ui-strings/HeaderStrings";

import { AuthContext } from "@/context/AuthProvider";
import { useAccess } from '@/context/AccessProvider';

import { EpsLogoutModal } from "@/components/EpsLogoutModal";

export default function EpsHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useContext(AuthContext);
  const accessContext = useAccess();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  useEffect(() => {
    console.warn("Access Context: ", accessContext);
  }, [accessContext])
  
  const redirectToLogin = async (e: React.MouseEvent | React.KeyboardEvent) => {
    // Naked href don't respect the router, so this overrides that
    e.preventDefault();
    router.push("/login")
  }
  
  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    router.push("/logout"); 
  };

  const handleLogoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setShowLogoutModal(true);
  };

  return (
    <>
      <Header transactional className="masthead" id="eps-header">
        <Header.Container className="masthead-container">
          <Header.Logo href="/" data-testid="eps_header_logoLink" />

          <Header.ServiceName 
            href="/login" 
            onClick={redirectToLogin}
            data-testid="eps_header_serviceName"
          >
            {HEADER_SERVICE}
          </Header.ServiceName>
          <Header.Content />
        </Header.Container>

        <Header.Nav className="masthead-nav">
          
          {/* TODO: Verify behaviour */}
          {
            pathname !== "/selectyourrole"
            && pathname !== "/changerole"
            && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  href={HEADER_SELECT_YOUR_ROLE_TARGET}
                  data-testid="eps_header_selectYourRoleLink"
                >
                  {HEADER_SELECT_YOUR_ROLE_BUTTON}
                </Link>
              </li>
            )
          }

          {/* TODO: Verify
            Change Role is only shown if we have multiple roles with access, and are not on the role selection page already */}
          {
            pathname !== "/selectyourrole"
            && pathname !== "/changerole"
            && auth?.isSignedIn
            // && !singleAccess 
            && (
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  href={HEADER_CHANGE_ROLE_TARGET}
                  data-testid="eps_header_changeRoleLink"
                >
                  {HEADER_CHANGE_ROLE_BUTTON}
                </Link>
              </li>
            )
          }

          {/* FIXME: Show the Confirm Role page header link only if we have a selected role */}
          {/* {
            pathname !== "/selectyourrole"
            && pathname !== "/changerole"
            auth?.isSignedIn
            && selectedRole !== ""
            && ( */}
              <li className="nhsuk-header__navigation-item">
                <Link
                  className="nhsuk-header__navigation-link"
                  href={HEADER_CONFIRM_ROLE_TARGET}
                  data-testid="eps_header_confirmRoleLink"
                >
                  {HEADER_CONFIRM_ROLE_BUTTON}
                </Link>
              </li>
            {/* )
          } */}

          {/* FIXME: Only shows the Log out link if the user is signed in, but introduces a lag on page reload. */}
          {auth?.isSignedIn && (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                href="/logout"
                data-testid="eps_header_logout"
                onClick={handleLogoutClick}
              >
                Log out
              </Link>
            </li>
          )}
          
          <Header.NavDropdownMenu dropdownText="Menu" />
        </Header.Nav>
      </Header>

      <EpsLogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
