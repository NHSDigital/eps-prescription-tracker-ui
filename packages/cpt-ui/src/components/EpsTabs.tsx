import React, {useEffect, useCallback, useRef} from "react"
import {Link, useNavigate} from "react-router-dom"
import {Tabs} from "nhsuk-react-components"
import "../styles/tabs.scss"

export interface TabHeader {
  title: string;
  link: string;
}

interface EpsTabsProps {
  activeTabPath: string;
  tabHeaderArray: Array<TabHeader>;
  children: React.ReactNode;
  variant?: "default" | "large";
}

export default function EpsTabs({
  activeTabPath,
  tabHeaderArray,
  children,
  variant = "default"
}: EpsTabsProps) {
  const baseClass = "nhsuk-tabs"
  const variantClass = variant === "large" ? `${baseClass}--large` : ""
  const tabClass = `${baseClass} ${variantClass}`.trim()

  const navigate = useNavigate()
  const keyboardNavigatedRef = useRef(false)
  const lastKeyboardFocusedTabRef = useRef<string | null>(null)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement

    // Prevent tab switching if focus is in an input box
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
    ) {
      return
    }
    const tabs = tabHeaderArray
    const currentTabIndex = tabs.findIndex(
      (tab) => activeTabPath.startsWith(tab.link)
    )

    let newTabIndex = currentTabIndex
    if (event.key === "ArrowLeft") {
      newTabIndex = Math.max(0, currentTabIndex - 1)
    } else if (event.key === "ArrowRight") {
      newTabIndex = Math.min(tabs.length - 1, currentTabIndex + 1)
    }

    if (newTabIndex !== currentTabIndex) {
      const newTab = tabs[newTabIndex]
      keyboardNavigatedRef.current = true
      navigate(newTab.link)
    }
  }, [navigate, tabHeaderArray, activeTabPath])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  // Focus management for keyboard navigation
  useEffect(() => {
    if (keyboardNavigatedRef.current) {
      // Remove keyboard focus class from previous tab
      if (lastKeyboardFocusedTabRef.current) {
        const prevTab = document.getElementById(lastKeyboardFocusedTabRef.current)
        if (prevTab) {
          prevTab.classList.remove("keyboard-focused")
        }
      }

      const activeId = `tab_${activeTabPath.substring(1)}`
      const activeEl = document.getElementById(activeId) as HTMLAnchorElement | null
      if (activeEl) {
        activeEl.focus()
        activeEl.classList.add("keyboard-focused")
        lastKeyboardFocusedTabRef.current = activeId
      }
      keyboardNavigatedRef.current = false
    }
  }, [activeTabPath])

  const renderAccessibleTitle = (title: string) => {
    const match = title.match(/^(.*)\s\((\d+)\)$/)
    if (!match) return title

    const prefix = match[1]
    const count = match[2]
    return (
      <span>
        <span>{prefix} </span>
        <span aria-hidden="true">(</span>
        <span aria-hidden="true">{count}</span>
        <span className="nhsuk-u-visually-hidden"> {count} prescriptions</span>
        <span aria-hidden="true">)</span>
      </span>
    )
  }

  return (
    <div className={tabClass}>
      <Tabs.Title>Contents</Tabs.Title>
      <Tabs.List>
        {tabHeaderArray.map((tab) => {
          // we are using a custom list item component here instead of Tabs.ListItem
          // because the built-in functionality of Tabs.ListItem does not allow for
          // the tab to navigate us to separate urls instead it is hardwired to work
          // with target ids, which goes against our intended use case
          const isActive = tab.link.includes(activeTabPath)
          return (
            <li
              key={tab.link}
              className={`${baseClass}__list-item ${isActive ? `${baseClass}__list-item--selected` : ""}`}
              role="presentation"
            >
              <Link
                className={`${baseClass}__tab ${isActive ? `${baseClass}__tab--selected` : ""}`}
                role="tab"
                aria-selected={isActive ? "true" : "false"}
                id={`tab_${tab.link.substring(1)}`}
                aria-controls={`panel_${tab.link.substring(1)}`}
                to={tab.link}
                data-testid={`eps-tab-heading ${tab.link}`}
                tabIndex={isActive ? 0 : -1}
              >
                {renderAccessibleTitle(tab.title)}
              </Link>
            </li>
          )
        })}
      </Tabs.List>
      <div
        className={`${baseClass}__panel`}
        id={`panel_${activeTabPath.substring(1)}`}
        role="tabpanel"
        aria-labelledby={`tab_${activeTabPath.substring(1)}`}
      >
        {children}
      </div>
    </div>
  )
}
