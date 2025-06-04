
import {AxiosInstance, AxiosResponse} from "axios"
import {jest} from "@jest/globals"

export const mockAxiosInstance = (status: number, data: unknown) => {
  return {
    get: jest.fn(() => Promise.resolve({
      status,
      data
    } as unknown as AxiosResponse))
  } as unknown as AxiosInstance
}

export const mockAxiosErrorInstance = () => {
  return {
    get: jest.fn(() => Promise.reject({} as unknown as AxiosResponse))
  } as unknown as AxiosInstance
}
