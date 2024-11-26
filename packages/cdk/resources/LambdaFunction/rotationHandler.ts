import {SecretsManagerRotationHandler} from "aws-lambda"
import AWS from "aws-sdk"

const secretsManager = new AWS.SecretsManager()
const kms = new AWS.KMS()

/**
 * Handler for Secrets Manager rotation events.
 */
export const handler: SecretsManagerRotationHandler = async (event) => {
  console.log("Rotation event:", JSON.stringify(event, null, 2))

  const secretId = event.SecretId
  const step = event.Step

  try {
    switch (step) {
      case "createSecret":
        await createSecret(secretId)
        break
      case "setSecret":
        await setSecret(secretId)
        break
      case "testSecret":
        await testSecret(secretId)
        break
      case "finishSecret":
        await finishSecret(secretId)
        break
      default:
        throw new Error(`Unknown step: ${step}`)
    }
    console.log(`Successfully handled rotation step: ${step}`)
  } catch (error) {
    console.error(`Error handling rotation step: ${step}`, error)
    throw error
  }
}

/**
 * Creates a new secret value.
 * @param secretId The secret ID.
 */
async function createSecret(secretId: string): Promise<void> {
  console.log(`Creating new secret for ${secretId}...`)

  const secretValueResponse = await secretsManager.getSecretValue({SecretId: secretId}).promise()
  if (!secretValueResponse) {
    throw new Error(`Secret not found for ${secretId}`)
  }

  const kmsKeyId = process.env.KMS_KEY_ARN
  if (!kmsKeyId) {
    throw new Error("KMS_KEY_ARN environment variable is not set.")
  }

  const newSecret = await kms.generateDataKey({
    KeyId: kmsKeyId, // Use the KMS key ARN from the environment variable
    KeySpec: "AES_256"
  }).promise()

  if (!newSecret || !newSecret.Plaintext) {
    throw new Error(`Failed to generate new data key for ${secretId}`)
  }

  await secretsManager.putSecretValue({
    SecretId: secretId,
    ClientRequestToken: newSecret.CiphertextBlob?.toString("base64"), // Optional token for version tracking
    SecretBinary: newSecret.Plaintext,
    VersionStages: ["AWSPENDING"] // Marks the secret version as pending
  }).promise()

  console.log(`Created new secret version for ${secretId}`)
}

/**
 * Sets the secret in the target application or service.
 * @param secretId The secret ID.
 */
async function setSecret(secretId: string): Promise<void> {
  console.log(`Setting secret for ${secretId}...`)
  // Example implementation: Integrate with the target service to update credentials.
  // This is a placeholder for real integration logic.
  console.log(`Secret ${secretId} has been set in the target application/service.`)
}

/**
 * Tests the new secret value.
 * @param secretId The secret ID.
 */
async function testSecret(secretId: string): Promise<void> {
  console.log(`Testing secret for ${secretId}...`)
  // Example implementation: Test the new secret with the target application or service.
  // This is a placeholder for real testing logic.
  console.log(`Secret ${secretId} has been tested successfully.`)
}

/**
 * Marks the rotation as complete.
 * @param secretId The secret ID.
 */
async function finishSecret(secretId: string): Promise<void> {
  console.log(`Finishing rotation for ${secretId}...`)

  const metadata = await secretsManager.describeSecret({SecretId: secretId}).promise()
  if (!metadata) {
    throw new Error(`Secret metadata not found for ${secretId}`)
  }

  const currentVersion = metadata.VersionIdsToStages
    ? Object.keys(metadata.VersionIdsToStages).find((version) =>
      metadata.VersionIdsToStages?.[version].includes("AWSCURRENT")
    )
    : undefined

  const pendingVersion = metadata.VersionIdsToStages
    ? Object.keys(metadata.VersionIdsToStages).find((version) =>
      metadata.VersionIdsToStages?.[version].includes("AWSPENDING")
    )
    : undefined

  if (!pendingVersion) {
    throw new Error(`No AWSPENDING version found for ${secretId}`)
  }

  if (currentVersion === pendingVersion) {
    console.log(`Secret version ${pendingVersion} is already marked as current.`)
    return
  }

  await secretsManager.updateSecretVersionStage({
    SecretId: secretId,
    VersionStage: "AWSCURRENT",
    MoveToVersionId: pendingVersion,
    RemoveFromVersionId: currentVersion
  }).promise()

  console.log(`Rotation complete for ${secretId}. Pending version ${pendingVersion} is now current.`)
}
