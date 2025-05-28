import {jest} from "@jest/globals"
import * as pds from "@cpt-ui-common/pdsClient"

export const mockPdsClient = () => {
  return {
    with_access_token: jest.fn().mockReturnThis(),
    with_role_id: jest.fn().mockReturnThis(),
    patientSearch: jest.fn()
  } as unknown as pds.Client
}
