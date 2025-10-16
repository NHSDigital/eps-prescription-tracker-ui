import {renderHook} from "@testing-library/react"
import {useBackNavigation} from "@/hooks/useBackNavigation"
import {useNavigationContext} from "@/context/NavigationProvider"
import {FRONTEND_PATHS} from "@/constants/environment"

jest.mock("@/context/NavigationProvider", () => ({
  useNavigationContext: jest.fn()
}))

const mockUseNavigationContext = useNavigationContext as jest.MockedFunction<
  typeof useNavigationContext
>

describe("useBackNavigation", () => {
  const mockGoBack = jest.fn()
  const mockGetBackPath = jest.fn()

  beforeEach(() => {
    mockUseNavigationContext.mockReturnValue({
      goBack: mockGoBack,
      getBackPath: mockGetBackPath,
      pushNavigation: jest.fn(),
      setOriginalSearchPage: jest.fn(),
      captureOriginalSearchParameters: jest.fn(),
      getOriginalSearchParameters: jest.fn(),
      getRelevantSearchParameters: jest.fn(),
      startNewNavigationSession: jest.fn()
    })
    jest.clearAllMocks()
  })

  describe("getBackLink", () => {
    it("returns navigation context back path when available", () => {
      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })

    it("returns default search when navigation context returns null", () => {
      mockGetBackPath.mockReturnValue(null)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })

    it("returns NHS number search from navigation context", () => {
      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })

    it("returns basic details search from navigation context", () => {
      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
      )
    })

    it("returns basic details search from patient search results page", () => {
      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
      )
    })
  })

  describe("goBack behavior", () => {
    it("calls navigation context goBack", () => {
      const {result} = renderHook(() => useBackNavigation())

      result.current.goBack()

      expect(mockGoBack).toHaveBeenCalledTimes(1)
    })

    it("delegates navigation logic to navigation context", () => {
      const {result} = renderHook(() => useBackNavigation())

      result.current.goBack()
      result.current.goBack()

      expect(mockGoBack).toHaveBeenCalledTimes(2)
    })
  })

  describe("hook dependencies", () => {
    it("updates when navigation context changes", () => {
      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID)

      const {result, rerender} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )

      mockGetBackPath.mockReturnValue(FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER)

      rerender()
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER
      )
    })

    it("handles navigation context returning null", () => {
      mockGetBackPath.mockReturnValue(null)

      const {result} = renderHook(() => useBackNavigation())
      expect(result.current.getBackLink()).toBe(
        FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID
      )
    })
  })
})
