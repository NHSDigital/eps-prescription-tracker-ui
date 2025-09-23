import http from "@/helpers/axios"
import {fetchAuthSession} from "aws-amplify/auth"
import MockAdapter from "axios-mock-adapter"
import {v4 as uuidv4} from "uuid"

jest.mock("uuid", () => ({
  // Always return the same UUID so we can test it
  v4: jest.fn()
}))

jest.mock("aws-amplify/auth", () => ({
  // Always return the same UUID so we can test it
  fetchAuthSession: jest.fn().mockReturnValue({tokens: {idToken: "mock_auth_token"}})
}))
describe("HTTP Axios Instance", () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.reset()
  })

  it("adds X-request-id and x-correlation-id header with a UUID on every request", async () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce("test-x-request-id")
      .mockReturnValueOnce("test-x-correlation-id")
    mock.onGet("/test").reply((config) => {
      // 'config.headers' is possibly 'undefined'.
      // Cannot invoke an object which is possibly 'undefined'.ts(2722)
      expect(config.headers?.["x-request-id"]).toBe("test-x-request-id")
      expect(config.headers?.["x-correlation-id"]).toBe("test-x-correlation-id")
      return [200, {success: true}]
    })

    const response = await http.get("/test")

    expect(response.status).toBe(200)
    expect(response.data).toEqual({success: true})
  })

  it("does add x-session-id header when cwr_s cookie does exist", async () => {
    mock.onGet("/test").reply((config) => {
      // 'config.headers' is possibly 'undefined'.
      // Cannot invoke an object which is possibly 'undefined'.ts(2722)
      expect(config.headers?.["x-rum-session-id"]).toBe("my_session_id")
      return [200, {success: true}]
    })

    const response = await http.get("/test")

    expect(response.status).toBe(200)
    expect(response.data).toEqual({success: true})
  })

  it("adds Authorization header on every request", async () => {
    mock.onGet("/test").reply((config) => {
      // 'config.headers' is possibly 'undefined'.
      // Cannot invoke an object which is possibly 'undefined'.ts(2722)
      expect(config.headers?.["Authorization"]).toBe("Bearer mock_auth_token")
      return [200, {success: true}]
    })

    const response = await http.get("/test")

    expect(response.status).toBe(200)
    expect(response.data).toEqual({success: true})
  })

  it("retries up to 3 times for mixed errors, then succeeds", async () => {
    mock
      .onGet("/test")
      .replyOnce(401)
      .onGet("/test")
      .replyOnce(500)
      .onGet("/test")
      .replyOnce(413)
      .onGet("/test")
      .replyOnce(200, {retried: true})

    const response = await http.get("/test")

    expect(response.status).toBe(200)
    expect(response.data).toEqual({retried: true})

    expect(mock.history.get.length).toBe(4)
  })

  it("fails after 3 retries if 401 persists", async () => {
    mock.onGet("/test").reply(401)

    await expect(http.get("/test")).rejects.toThrow()

    // Check how many calls were made (should be 4: initial + 3 retries)
    expect(mock.history.get.length).toBe(4)
  })

  it("fails if can not get token", async () => {
    (fetchAuthSession as jest.Mock)
      .mockReturnValueOnce("not a token")
    mock.onGet("/test").reply(200)

    await expect(http.get("/test")).rejects.toThrow("canceled")
  })

  it("Does not retry if response says to restart login", async () => {
    mock.onGet("/test").reply(401, {restartLogin: true})

    await expect(http.get("/test")).rejects.toThrow()

    expect(mock.history.get.length).toBe(1)
  })
})
