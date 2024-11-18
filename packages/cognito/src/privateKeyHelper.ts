import {getSecret} from "@aws-lambda-powertools/parameters/secrets"

/*
This is in a separate file to allow easier mocking in unit tests
*/

export async function getJwtPrivateKey(jwtPrivateKeyArn: string) {
  return await getSecret(jwtPrivateKeyArn)
}
