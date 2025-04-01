import {Construct} from "constructs"
import fs from 'fs'

export class setConfig extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const configFileName = this.node.tryGetContext("configFileName")

    const configDetails = JSON.parse(fs.readFileSync(configFileName, 'utf-8'))

    this.node.setContext("primaryOidcClientId", configDetails["primaryOidcClientId"])
}
