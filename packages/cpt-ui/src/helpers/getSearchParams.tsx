export function getSearchParams(window: Window & typeof globalThis) {
  const params = new URLSearchParams(window.location.search)
  const codeParams = params.get("code")
  const stateParams = params.get("state")
  return {codeParams, stateParams}
}
