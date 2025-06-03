export const exhaustive_switch_guard = (guard: never): never => {
  // Ensures that all possible cases of a union type are handled by a switch.
  // By calling this function in the default case with the value switched on
  // the typescript compiler will throw an error if any cases are missing,
  // since an exhaustive switch leaves the value with only the never type.
  throw guard
}
