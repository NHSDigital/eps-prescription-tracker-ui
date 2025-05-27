import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {axios} from "index"

export interface Client{
    readonly axiosInstance: AxiosInstance,
    readonly pdsEndpoint: string,
    readonly logger: Logger,
    apigeeAccessToken?: string,
    roleId?: string,

    axios_get(url: string): Promise<axios.Outcome>
    headers(): Record<string, string>
    with_access_token(apigeeAccessToken: string): this
    with_role_id(roleId: string): this
}
