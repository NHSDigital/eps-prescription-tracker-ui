import {PatientSummaryGender} from "@cpt-ui-common/common-types"
import {PatientAddressUse} from "../../schema/address"
import {PatientNameUse} from "src/schema/name"

// TODO: AEA-5926 - see if theres any commonality with response fom other interaction
export interface PDSResponse {
  id: string
  name?: Array<{
    given?: Array<string>
    family?: string
    use?: PatientNameUse
  }>;
  gender?: PatientSummaryGender
  birthDate?: string
  address?: Array<{
    line?: Array<string>
    city?: string
    postalCode?: string
    use: PatientAddressUse
  }>;
  meta?: {
    security?: Array<{
      code: string
    }>
  }
}
