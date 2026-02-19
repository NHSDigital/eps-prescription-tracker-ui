import React from "react"
import {render, act, renderHook} from "@testing-library/react"
import {MemoryRouter} from "react-router-dom"
import {NavigationContextType, NavigationProvider, useNavigationContext} from "@/context/NavigationProvider"
import {FRONTEND_PATHS} from "@/constants/environment"
import {logger} from "@/helpers/logger"

jest.mock("@/helpers/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn()
  }
}))

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}))

const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialEntries?: Array<string>;
}> = ({children, initialEntries = ["/"]}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <NavigationProvider>{children}</NavigationProvider>
  </MemoryRouter>
)

const TestComponent: React.FC<{
  onContextReady?: (context: NavigationContextType) => void;
}> = ({onContextReady}) => {
  const navigationContext = useNavigationContext()

  React.useEffect(() => {
    if (onContextReady) {
      onContextReady(navigationContext)
    }
  }, [navigationContext, onContextReady])

  return <div data-testid="test-component">Test Component</div>
}

describe("NavigationProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("useNavigationContext hook", () => {
    it("should provide context when used within NavigationProvider", () => {
      const {result} = renderHook(() => useNavigationContext(), {
        wrapper: TestWrapper
      })

      expect(result.current).toBeDefined()
      expect(typeof result.current.pushNavigation).toBe("function")
      expect(typeof result.current.goBack).toBe("function")
      expect(typeof result.current.getBackPath).toBe("function")
    })
  })

  describe("pushNavigation", () => {
    it("should add new entry and handle duplicates", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.pushNavigation("/test-path")
        context!.pushNavigation("/test-path") // duplicate should be ignored
      })

      expect(logger.info).toHaveBeenCalledWith("Navigation: Pushing entry", {
        path: "/test-path",
        stackLength: expect.any(Number)
      })
    })

    it("should handle prescription details and list pages specially", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.pushNavigation(FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT)
        context!.pushNavigation(FRONTEND_PATHS.PRESCRIPTION_DETAILS_PAGE)
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Navigation:"),
        expect.any(Object)
      )
    })
  })

  describe("setOriginalSearchPage", () => {
    it.each([
      ["prescriptionId", FRONTEND_PATHS.SEARCH_BY_PRESCRIPTION_ID],
      ["nhsNumber", FRONTEND_PATHS.SEARCH_BY_NHS_NUMBER],
      ["basicDetails", FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS]
    ])(
      "should set original search page for %s search",
      async (searchType, expectedPath) => {
        let context: NavigationContextType | undefined
        render(
          <TestWrapper>
            <TestComponent onContextReady={(ctx) => (context = ctx)} />
          </TestWrapper>
        )

        await act(async () => {
          context!.setOriginalSearchPage(
            searchType as "prescriptionId" | "nhsNumber" | "basicDetails"
          )
        })

        expect(logger.info).toHaveBeenCalledWith(
          "Navigation: Setting original search page",
          {path: expectedPath}
        )
      }
    )
  })

  describe("captureOriginalSearchParameters", () => {
    it("should capture parameters and clear navigation stack", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      const searchParams = {prescriptionId: "12345", issueNumber: "1"}

      await act(async () => {
        context!.captureOriginalSearchParameters(
          "prescriptionId",
          searchParams
        )
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Navigation: Capturing original search parameters",
        {searchType: "prescriptionId", params: searchParams}
      )
    })

    it("should handle basic details search parameters", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      const searchParams = {
        firstName: "John",
        lastName: "Doe",
        dobDay: "01",
        dobMonth: "01",
        dobYear: "1990",
        postcode: "SW1A 1AA"
      }

      await act(async () => {
        context!.captureOriginalSearchParameters("basicDetails", searchParams)
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Navigation: Capturing original search parameters",
        {searchType: "basicDetails", params: searchParams}
      )
    })
  })

  describe("getOriginalSearchParameters", () => {
    it("should return null when no parameters captured", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      expect(context!.getOriginalSearchParameters()).toBeNull()
    })

    it("should return captured parameters", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      const searchParams = {prescriptionId: "12345"}

      await act(async () => {
        context!.captureOriginalSearchParameters(
          "prescriptionId",
          searchParams
        )
      })

      expect(context!.getOriginalSearchParameters()).toEqual(searchParams)
    })
  })

  describe("getRelevantSearchParameters", () => {
    it("should return empty object when no parameters or type mismatch", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.captureOriginalSearchParameters("prescriptionId", {
          prescriptionId: "12345"
        })
      })

      expect(context!.getRelevantSearchParameters("prescriptionId")).toEqual({
        prescriptionId: "12345"
      })
      expect(context!.getRelevantSearchParameters("nhsNumber")).toEqual({})
    })

    it("should filter relevant parameters correctly", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      const allParams = {
        prescriptionId: "12345",
        issueNumber: "1",
        firstName: "John",
        nhsNumber: "1234567890",
        postcode: "SW1A 1AA"
      }

      await act(async () => {
        context!.captureOriginalSearchParameters("basicDetails", allParams)
      })

      const result = context!.getRelevantSearchParameters("basicDetails")
      expect(result).toEqual({
        firstName: "John",
        postcode: "SW1A 1AA"
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Navigation: Getting relevant search parameters",
        expect.objectContaining({searchType: "basicDetails"})
      )
    })

    it("should handle undefined parameters gracefully", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.captureOriginalSearchParameters("prescriptionId", {
          prescriptionId: "12345",
          issueNumber: undefined
        })
      })

      expect(context!.getRelevantSearchParameters("prescriptionId")).toEqual({
        prescriptionId: "12345"
      })
    })
  })

  describe("getBackPath", () => {
    it("should return null when no navigation history", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper initialEntries={["/current-page"]}>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      expect(context!.getBackPath()).toBeNull()
    })

    it("should handle prescription details navigation", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper initialEntries={["/prescription-details"]}>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.pushNavigation("/prescription-list-current")
        context!.pushNavigation("/prescription-details")
      })

      expect(context!.getBackPath()).toBe("/prescription-list-current")
    })

    it("should return original search page when available", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper initialEntries={["/other-page"]}>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.setOriginalSearchPage("basicDetails")
      })

      expect(context!.getBackPath()).toBe(
        FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS
      )
    })
  })

  describe("goBack", () => {
    it("should warn when no back path available", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.goBack()
      })

      expect(logger.warn).toHaveBeenCalledWith(
        "Navigation: No back path found, staying on current page"
      )
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it("should navigate and update stack", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper initialEntries={["/initial-page"]}>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.pushNavigation("/page1")
        context!.pushNavigation("/page2")
      })

      const backPath = context!.getBackPath()
      expect(backPath).not.toBeNull()

      await act(async () => {
        context!.goBack()
      })

      expect(mockNavigate).toHaveBeenCalled()
    })

    it("should handle prescription list to search navigation", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper initialEntries={["/prescription-list-current"]}>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.setOriginalSearchPage("basicDetails")
      })

      expect(context!.getBackPath()).toBe(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)

      await act(async () => {
        context!.goBack()
      })

      expect(mockNavigate).toHaveBeenCalledWith(FRONTEND_PATHS.SEARCH_BY_BASIC_DETAILS)
    })
  })

  describe("startNewNavigationSession", () => {
    it("should clear all navigation state", async () => {
      let context: NavigationContextType | undefined
      render(
        <TestWrapper>
          <TestComponent onContextReady={(ctx) => (context = ctx)} />
        </TestWrapper>
      )

      await act(async () => {
        context!.captureOriginalSearchParameters("basicDetails", {
          firstName: "John"
        })
        context!.pushNavigation("/some-page")
        context!.startNewNavigationSession()
      })

      expect(context!.getOriginalSearchParameters()).toBeNull()
    })
  })
})
