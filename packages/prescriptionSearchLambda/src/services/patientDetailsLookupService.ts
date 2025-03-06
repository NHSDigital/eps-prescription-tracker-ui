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

  logger.info("roleId, pdsEndpoint", {roleId, pdsEndpoint})

  try {
    // TODO: uncomment this block before merge and remove the sandbox block
    // const response = await axiosInstance.get(
    //   `${pdsEndpoint}/personal-demographics/FHIR/R4/Patient/${nhsNumber}`,
    //   {
    //     headers: {
    //       Accept: "application/fhir+json",
    //       Authorization: `Bearer ${apigeeAccessToken}`,
    //       "nhsd-end-user-organisation-ods": "A83008",
    //       "nhsd-session-urid": roleId,
    //       "x-request-id": uuidv4(),
    //       //TODO: we need to pass this from the ui request.
    //       "x-correlation-id": uuidv4()
    //       //TODO: investigate what the jobrole should be. It is currently hardcoded
    //       // "nhsd-session-jobrole": "123456123456",
    //     }
    //   }
    // )

    const response = await axiosInstance.get(
      `https://sandbox.api.service.nhs.uk/personal-demographics/FHIR/R4/Patient/${nhsNumber}`,
      {
        headers: {
          Accept: "application/fhir+json",
          Authorization: `Bearer ${apigeeAccessToken}`,
          "nhsd-end-user-organisation-ods": "Y12345",
          "nhsd-session-urid": "555254240100",
          "x-request-id": uuidv4(),
          //TODO: we need to pass this from the ui request.
          "x-correlation-id": uuidv4()
          //TODO: investigate what the jobrole should be. It is currently hardcoded
          // "nhsd-session-jobrole": "123456123456",
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
