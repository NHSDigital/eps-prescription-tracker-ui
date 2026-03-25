import {DockerImage, ILocalBundling, Token} from "aws-cdk-lib"
import {Construct} from "constructs"
import {ISource} from "aws-cdk-lib/aws-s3-deployment"
import {Asset} from "aws-cdk-lib/aws-s3-assets"

interface LocalBundleProps {
  bundling: ILocalBundling,
  environment?: Record<string, string>
}

export class LocalBundle implements ISource {
  markers: Record<string, string> = {}
  asset: Asset

  constructor(scope: Construct, id: string, props: LocalBundleProps) {
    // Replace any environment variable values that are Tokens with unique marker strings
    // and store the mapping of marker to Token for later replacement in the deployed environment
    if (props.environment) {
      for (const [key, value] of Object.entries(props.environment)) {
        if (Token.isUnresolved(value)) {
          const newMarker = `<<marker:0xbaba:${Object.keys(this.markers).length}>>`
          this.markers[newMarker] = value
          props.environment[key] = newMarker
        }
      }
    }
    this.asset = new Asset(scope, id, {
      path: ".", // unused but required
      bundling: {
        local: props.bundling,
        image: DockerImage.fromRegistry("alpine"), // unused but required
        environment: props.environment
      }
    })
  }

  bind() {
    return {
      bucket: this.asset.bucket,
      zipObjectKey: this.asset.s3ObjectKey,
      markers: this.markers,
      markersConfig: {
        jsonEscape: true
      }
    }
  }
}
