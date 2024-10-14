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
  valueToReplace: string
  replacementValue: string
}
type codeReplacements = Array<CodeReplacement>

interface KeyValue {
  key: string
  value: string
}
type KeyValues = Array<KeyValue>

export interface CloudfrontFunctionProps {
  readonly source: string
  readonly codeReplacements?: codeReplacements
  readonly keyValues?: KeyValues
}

export class CloudfrontFunction extends Construct {
  public readonly function: Function

  public constructor(scope: Construct, id: string, props: CloudfrontFunctionProps){
    super(scope, id)

    // Resources
    let functionStore: IKeyValueStore | undefined = undefined
    if (props.keyValues){
      functionStore = new KeyValueStore(this, "FunctionsStore", {
        source: ImportSource.fromInline(JSON.stringify(props.keyValues))
      })
    }

    /* Automatically include replacement of export statements as not supported by CF Functions,
    and replace placeholder KVS ID if KVS is required */
    const codeReplacements: codeReplacements = [
      {valueToReplace: "export", replacementValue: ""},
      ...functionStore ? [
        {valueToReplace: "KVS_ID_PLACEHOLDER", replacementValue: functionStore.keyValueStoreId}] : [],
      ...props.codeReplacements ? props.codeReplacements : []
    ]
    const functionCode = readFileSync(resolve(import.meta.dirname, props.source), "utf8")
    for (const codeReplacement of codeReplacements){
      functionCode.replace(codeReplacement.valueToReplace, codeReplacement.replacementValue)
    }

    const cloudfrontFunction = new Function(this, "Function", {
      code: FunctionCode.fromInline(functionCode),
      runtime: FunctionRuntime.JS_2_0,
      keyValueStore: functionStore,
      autoPublish: true
    })

    // Outputs
    this.function = cloudfrontFunction
  }
}
