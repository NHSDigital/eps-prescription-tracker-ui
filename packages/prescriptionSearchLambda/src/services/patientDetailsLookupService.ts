import {AxiosInstance} from "axios"
import {v4 as uuidv4} from "uuid"
import {PatientAPIResponse} from "../types"
import {Logger} from "@aws-lambda-powertools/logger"
import {createMinimalPatientDetails, mapPdsResponseToPatientDetails} from "../utils/responseMapper"
import {PDSError} from "../utils/errors"
import {validatePatientDetails} from "../utils/validation"

export const getPdsPatientDetails = async (
  axiosInstance: AxiosInstance,
  logger: Logger,
  pdsEndpoint: string,
  nhsNumber: string,
  apigeeAccessToken: string,
  roleId: string
): Promise<PatientAPIResponse> => {
  const startTime = Date.now()
  logger.info("Fetching patient details from PDS", {nhsNumber})

  try {
    const response = await axiosInstance.get(
      `${pdsEndpoint}/personal-demographics/FHIR/R4/Patient/${nhsNumber}`,
      {
        headers: {
          Accept: "application/fhir+json",
          Authorization: `Bearer ${apigeeAccessToken}`,
          "nhsd-session-urid": roleId,
          "x-request-id": uuidv4(),
          //TODO: we need to pass this from the ui request.
          "x-correlation-id": uuidv4(),
          //TODO: investigate what the jobrole should be. It is currently hardcoded
          "nhsd-session-jobrole": "123456123456",
          "nhsd-end-user-organisation-ods": "A83008"
        }
      }
    )

    logger.info("PDS response time", {
      timeMs: Date.now() - startTime,
      nhsNumber
    })

    if (!response.data) {
      throw new PDSError("Patient not found", "NOT_FOUND")
    }

    // Check specifically for S flag first
    if (response.data.meta?.security?.some((s: { code: string }) => s.code === "S")) {
      logger.info("Patient record marked with S Flag", {nhsNumber})
      throw new PDSError("Prescription not found", "S_FLAG")
    }

    // Then check for R flag
    if (response.data.meta?.security?.some((s: { code: string }) => s.code === "R")) {
      logger.info("Patient record marked as restricted", {nhsNumber})
      throw new PDSError("Prescription not found", "R_FLAG")
    }

    // Handle superseded NHS numbers
    if (response.data.id !== nhsNumber) {
      logger.info("NHS Number has been superseded", {
        originalNhsNumber: nhsNumber,
        newNhsNumber: response.data.id
      })
      const patientDetails = mapPdsResponseToPatientDetails(response.data)
      return {
        ...patientDetails,
        supersededBy: response.data.id
      }
    }

    const patientDetails = mapPdsResponseToPatientDetails(response.data)

    try {
      validatePatientDetails(patientDetails)
      return patientDetails
    } catch {
      throw new PDSError("Incomplete patient data", "INCOMPLETE_DATA")
    }

  } catch (error) {
    logger.error("Error fetching patient details from PDS", {
      error,
      nhsNumber,
      timeMs: Date.now() - startTime
    })

    // Create a PDSError if it's not already one
    const pdsError = error instanceof PDSError
      ? error
      : new PDSError("Failed to fetch patient details")

    // Return minimal details with the error
    return {
      ...createMinimalPatientDetails(),
      _pdsError: pdsError
    }
  }
}
