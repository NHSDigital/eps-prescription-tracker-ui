import React, {useEffect, useCallback} from "react"
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
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const tabs = tabHeaderArray
    const currentTabIndex = tabs.findIndex(
      (tab) => tab.link.includes(activeTabPath)
    )

    let newTabIndex = currentTabIndex
    if (event.key === "ArrowLeft") {
      newTabIndex = Math.max(0, currentTabIndex - 1)
    } else if (event.key === "ArrowRight") {
      newTabIndex = Math.min(tabs.length - 1, currentTabIndex + 1)
    }

    if (newTabIndex !== currentTabIndex) {
      const newTab = tabs[newTabIndex]
      navigate(newTab.link)
    }
  }, [navigate])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

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
                {tab.title}
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
