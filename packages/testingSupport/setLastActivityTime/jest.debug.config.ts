import type {Config} from "jest"
import config from "./jest.config"

export default {
  ...config,
  runInBand: true,
  verbose: true
} satisfies Config
