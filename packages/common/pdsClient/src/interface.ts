import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {axios} from "./index"
import {URL} from "url"

export interface Client{
    readonly axiosInstance: AxiosInstance,
    readonly pdsEndpoint: URL,
    readonly logger: Logger,
    apigeeAccessToken?: string,
    roleId?: string,
    orgCode?: string,
    correlationId?: string

    axios_get(url: URL): Promise<axios.Outcome>
    headers(): Record<string, string>
    with_access_token(apigeeAccessToken: string): this
    with_role_id(roleId: string): this
    with_org_code(orgCode: string): this
    with_correlation_id(correlationId: string): this
}
