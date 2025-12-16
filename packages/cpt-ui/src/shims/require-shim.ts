// Shim for packages that incorrectly use CommonJS require() in ES modules
// This is specifically for nhsuk-react-components-extensions which incorrectly
// uses require('react-input-mask') in its ES module build

import ReactInputMask from "react-input-mask"

// Add require to the global scope for the browser environment only
if (typeof window !== "undefined") {
  // Create a require function specifically for react-input-mask
  function browserRequire(id: string): unknown {
    if (id === "react-input-mask") {
      return ReactInputMask
    }
    throw new Error(`require() is not supported in browser ES modules. Module requested: ${id}`)
  }

  // Assign to globalThis if require doesn't already exist
  if (!(globalThis as Record<string, unknown>).require) {
    ;(globalThis as Record<string, unknown>).require = browserRequire
  }
}
