import React from "react"
import {Link} from "react-router-dom"
import {Tabs} from "nhsuk-react-components"

export interface TabHeader {
  title: string,
  link: string
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

  return (
    <div className={tabClass}>
      <Tabs.Title>Contents</Tabs.Title>
      <Tabs.List>
        {tabHeaderArray.map((tab) => (
          <li
            key={tab.link}
            className={
              `${baseClass}__list-item ${tab.link.includes(activeTabPath) ? `${baseClass}__list-item--selected` : ""}`
            }
            role="presentation"
          >
            <Link
              className={`${baseClass}__tab`}
              role="tab"
              aria-selected={tab.link.includes(activeTabPath) ? "true" : "false"}
              id={`tab_${tab.link.substring(1)}`}
              aria-controls={`panel_${tab.link.substring(1)}`}
              to={tab.link}
              data-testid={`eps-tab-heading ${tab.link}`}
            >
              {tab.title}
            </Link>
          </li>
        ))}
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
