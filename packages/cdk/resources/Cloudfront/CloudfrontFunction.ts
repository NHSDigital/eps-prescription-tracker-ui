import {
  Function,
  FunctionCode,
  FunctionRuntime,
  IKeyValueStore,
  ImportSource,
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

interface KeyValue {
  readonly key: string
  readonly value: string
}
type KeyValues = Array<KeyValue>

export interface CloudfrontFunctionProps {
  readonly functionName: string
  readonly sourceFileName: string
  readonly codeReplacements?: codeReplacements
  readonly keyValues?: KeyValues
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
    let functionStore: IKeyValueStore
    if (props.keyValues){
      functionStore = new KeyValueStore(this, "FunctionsStore", {
        source: ImportSource.fromInline(JSON.stringify({data: props.keyValues}))
      })
    } else {
      functionStore = new KeyValueStore(this, "FunctionsStore")

    }

    /* Automatically include replacement of export statements as not supported by CF Functions,
    and replace placeholder KVS ID if KVS is required */
    const codeReplacements: codeReplacements = [
      {valueToReplace: "export", replacementValue: ""},
      ...functionStore ? [
        {valueToReplace: "KVS_ID_PLACEHOLDER", replacementValue: functionStore.keyValueStoreId}] : [],
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
      keyValueStore: functionStore,
      autoPublish: true
    })

    // Outputs
    this.function = cloudfrontFunction
    this.functionStore = functionStore
  }
}
