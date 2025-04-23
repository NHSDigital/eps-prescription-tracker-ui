import {Logger} from "@aws-lambda-powertools/logger"
import {AxiosInstance} from "axios"
import {axios} from "index"

export interface Client{
    axiosInstance: AxiosInstance,
    pdsEndpoint: string,
    logger: Logger,

    axios_get(url: string, headers: Record<string, string>): Promise<axios.Outcome>
}
