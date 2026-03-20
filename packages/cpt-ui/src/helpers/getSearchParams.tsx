export function getSearchParams(window: Window & typeof globalThis) {
  const params = new URLSearchParams(window.location.search)
  const codeParams = params.get("code")
  const stateParams = params.get("state")
  const errorParams = params.get("error") ? params.get("error") : undefined
  return {codeParams, stateParams, errorParams}
}
