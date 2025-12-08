
import React from "react"
import classNames from "classnames"
import Tab, {TabProps} from "./components/Tab"
import "./_TabSet.scss"

interface TabSetComponent extends React.FC<React.HTMLProps<HTMLDivElement>> {
  Tab: React.FC<TabProps>;
}

const TabSet: TabSetComponent = ({className, ...rest}) => (
  <div className={classNames("nhsuk-tab-set", className)} {...rest} />
)

TabSet.Tab = Tab

export default TabSet
