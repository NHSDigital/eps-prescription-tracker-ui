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
}) => {
  // Determine the final tabIndex value
  let finalTabIndex: number
  if (disabled && tabIndex !== undefined) {
    // When disabled with explicit tabIndex, use the provided tabIndex
    finalTabIndex = tabIndex
  } else if (disabled) {
    // When disabled without explicit tabIndex, use -1
    finalTabIndex = -1
  } else if (active) {
    // Active tabs should always be 0 regardless of custom tabIndex
    finalTabIndex = 0
  } else {
    // Inactive tabs should be -1
    finalTabIndex = -1
  }

  return (
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
      disabled={disabled}
      tabIndex={finalTabIndex}
      data-testid={active ? "tab-active" : "tab-inactive"}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Tab
