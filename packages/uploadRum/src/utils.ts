import {S3} from "@aws-sdk/client-s3"
import {CustomProperties, rumFileService} from "./api"
import {Logger} from "@aws-lambda-powertools/logger"

const s3 = new S3({})

export const upsert = async (
  {appMonitorName, s3BucketName}: CustomProperties,
  logger: Logger
) => {
  const file = await rumFileService(appMonitorName)
  logger.info("Built rum script")

  const props = {
    Bucket: s3BucketName,
    Key: "rum.js",
    Body: file
  }
  logger.info(`Uploading the script with props ${props}`, {props})

  await s3.putObject(props)
  logger.info("Script was uploaded")
}

export const destroy = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  {appMonitorName, s3BucketName}: CustomProperties,
  logger: Logger
) => {
  const props = {
    Bucket: s3BucketName,
    Key: "rum.js"
  }
  logger.info(`Deleting the script with props ${props}`, {props})

  await s3.deleteObject(props)

  logger.info("Script was deleted")
}
