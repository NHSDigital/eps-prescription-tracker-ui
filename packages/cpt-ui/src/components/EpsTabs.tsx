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
}

export default function EpsTabs({
  activeTabPath,
  tabHeaderArray,
  children
}: EpsTabsProps) {
  return (
    <div className="nhsuk-tabs">
      <Tabs.Title>Contents</Tabs.Title>
      <Tabs.List>
        {tabHeaderArray.map((tab) => (
          // we are using a custom list item component here instead of Tabs.ListItem
          // because the built-in functionality of Tabs.ListItem does not allow for
          // the tab to navigate us to separate urls instead it is hardwired to work
          // with target ids, which goes against our intended use case
          <li
            key={tab.link}
            className={
              `nhsuk-tabs__list-item ${tab.link.includes(activeTabPath) ? "nhsuk-tabs__list-item--selected" : ""}`
            }
            role="presentation"
          >
            <Link
              className="nhsuk-tabs__tab"
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
        className="nhsuk-tabs__panel"
        id={`panel_${activeTabPath.substring(1)}`}
        role="tabpanel"
        aria-labelledby={`tab_${activeTabPath.substring(1)}`}
      >
        {children}
      </div>
    </div>
  )

}
