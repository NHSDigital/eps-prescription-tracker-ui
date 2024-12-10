import {
  Function,
  FunctionCode,
  FunctionRuntime,
  IKeyValueStore,
  KeyValueStore
} from "aws-cdk-lib/aws-cloudfront"
import {Construct} from "constructs"
import {readFileSync} from "fs"
import {resolve} from "path"

interface CodeReplacement {
  readonly valueToReplace: string
  readonly replacementValue: string
}
type codeReplacements = Array<CodeReplacement>

export interface CloudfrontFunctionProps {
  readonly functionName: string
  readonly sourceFileName: string
  readonly codeReplacements?: codeReplacements
  readonly keyValueStore: KeyValueStore
}

/**
 * Cloudfront function with support for KVS and code replacement

 */

export class CloudfrontFunction extends Construct {
  public readonly function: Function
  public readonly functionStore: IKeyValueStore

  public constructor(scope: Construct, id: string, props: CloudfrontFunctionProps){
    super(scope, id)

    // Resources

    /* Automatically include replacement of export statements as not supported by CF Functions,
    and replace placeholder KVS ID if KVS is required */
    const codeReplacements: codeReplacements = [
      {valueToReplace: "export", replacementValue: ""},
      {valueToReplace: "KVS_ID_PLACEHOLDER", replacementValue: props.keyValueStore.keyValueStoreId},
      ...props.codeReplacements ?? []
    ]
    let functionCode = readFileSync(
      resolve(__dirname, `../../../cloudfrontFunctions/src/${props.sourceFileName}`), "utf8")
    for (const codeReplacement of codeReplacements){
      functionCode = functionCode.replace(codeReplacement.valueToReplace, codeReplacement.replacementValue)
    }

    const cloudfrontFunction = new Function(this, "Function", {
      functionName: props.functionName,
      code: FunctionCode.fromInline(functionCode),
      runtime: FunctionRuntime.JS_2_0,
      keyValueStore: props.keyValueStore,
      autoPublish: true
    })

    // Outputs
    this.function = cloudfrontFunction
  }
}
