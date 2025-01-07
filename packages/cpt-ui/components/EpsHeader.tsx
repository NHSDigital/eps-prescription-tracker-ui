"use client"
import React, { useContext, useState } from "react";
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
  HEADER_SELECT_YOUR_ROLE_BUTTON,
  HEADER_SELECT_YOUR_ROLE_TARGET
} from "@/constants/ui-strings/HeaderStrings";

import { AuthContext } from "@/context/AuthProvider";
import { EpsLogoutModal } from "@/components/EpsLogoutModal";

export default function EpsHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useContext(AuthContext);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

          <Header.ServiceName href="/" data-testid="eps_header_serviceName">
            {HEADER_SERVICE}
          </Header.ServiceName>
          <Header.Content />
        </Header.Container>

        <Header.Nav className="masthead-nav">
          {/* Example placeholder links */}
          <li className="nhsuk-header__navigation-item">
            <Link className="nhsuk-header__navigation-link" href="/" data-testid="eps_header_placeholder1">
              Placeholder 1
            </Link>
          </li>

          <li className="nhsuk-header__navigation-item">
            <Link className="nhsuk-header__navigation-link" href="/login/" data-testid="eps_header_placeholder2">
              Placeholder 2
            </Link>
          </li>

          {/* Conditionally show "change role" or "confirm role" */}
          {pathname !== "/" ? (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                href={HEADER_CHANGE_ROLE_TARGET}
                data-testid="eps_header_changeRoleLink"
              >
                {HEADER_CHANGE_ROLE_BUTTON}
              </Link>
            </li>
          ) : (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                href={HEADER_CONFIRM_ROLE_TARGET}
                data-testid="eps_header_confirmRoleLink"
              >
                {HEADER_CONFIRM_ROLE_BUTTON}
              </Link>
            </li>
          )}

          {/* 
            FIXME: Only the selectyourrole and changerole links get put in the 
            collapsible menu when on mobile
          */}
          {pathname === "/selectyourrole" ? (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                href={HEADER_CONFIRM_ROLE_TARGET}
                data-testid="eps_header_confirmRoleLink"
              >
                {HEADER_CONFIRM_ROLE_BUTTON}
              </Link>
            </li>
          ) : (
            <li className="nhsuk-header__navigation-item">
              <Link
                className="nhsuk-header__navigation-link"
                href={HEADER_SELECT_YOUR_ROLE_TARGET}
                data-testid="eps_header_selectYourRoleLink"
              >
                {HEADER_SELECT_YOUR_ROLE_BUTTON}
              </Link>
            </li>
          )}

          {/* FIXME: Only shows the Log out link if the user is signed in, but introduces a lag on page reload. Acceptable? */}
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
