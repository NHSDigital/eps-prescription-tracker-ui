import {AxiosInstance} from "axios"
import {v4 as uuidv4} from "uuid"
import {PatientAPIResponse} from "../utils/types"
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
      `${pdsEndpoint}/Patient/${nhsNumber}`,
      {
        headers: {
          Accept: "application/fhir+json",
          Authorization: `Bearer ${apigeeAccessToken}`,
          "NHSD-End-User-Organisation-ODS": "A83008",
          "NHSD-Session-URID": roleId,
          "X-Request-ID": uuidv4(),
          "X-Correlation-ID": uuidv4()
        }
      }
    )

    logger.info("PDS response time", {
      timeMs: Date.now() - startTime,
      nhsNumber
    })

    // Log the response for debugging
    if (response.status !== 200) {
      logger.warn("PDS response not OK", {
        status: response.status,
        statusText: response.statusText,
        nhsNumber
      })
    }

    if (!response.data) {
      logger.error("PDS response data is empty", {nhsNumber})
      throw new PDSError("Patient not found", "NOT_FOUND")
    }

    // Log the data structure to help debug mapping issues
    logger.debug("PDS response data structure", {
      resourceType: response.data.resourceType,
      id: response.data.id,
      hasIdentifier: !!response.data.identifier,
      hasMeta: !!response.data.meta,
      hasName: !!response.data.name && Array.isArray(response.data.name),
      nameCount: response.data.name?.length,
      hasSecurity: !!response.data.meta?.security
    })

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
    } catch (validationError) {
      logger.error("Patient data validation failed", {
        error: validationError,
        patientDetails: JSON.stringify(patientDetails),
        nhsNumber
      })
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
