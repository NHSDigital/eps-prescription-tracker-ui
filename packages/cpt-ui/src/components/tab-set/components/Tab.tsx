import React from "react"
import classNames from "classnames"

export type TabProps = Omit<React.HTMLProps<HTMLButtonElement>, "controls"> & {
  active?: boolean;
  empty?: boolean;
  type?: "button" | "submit" | "reset";
  controls?: string;
  label?: string;
};

const Tab: React.FC<TabProps> = ({
  className,
  active,
  disabled,
  empty,
  type = "button",
  tabIndex,
  controls,
  label,
  children,
  ...rest
}) => (
  <button
    className={classNames(
      "nhsuk-tab-set__tab",
      {"nhsuk-tab-set__tab--active": active},
      {"nhsuk-tab-set__tab--disabled": disabled},
      {"nhsuk-tab-set__tab--empty": empty},
      className
    )}
    type={type}
    role="tab"
    aria-selected={active ? "true" : "false"}
    aria-controls={controls}
    aria-label={label}
    tabIndex={disabled === true && tabIndex === undefined ? -1 : (active ? 0 : -1)}
    {...rest}
  >
    {children}
  </button>
)

export default Tab
