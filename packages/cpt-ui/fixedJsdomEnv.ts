import JSDOMEnvironment from "jest-environment-jsdom"

// https://github.com/jsdom/jsdom/issues/3363
export default class FixedJsdomEnv extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>){
    super(...args)
    this.global.structuredClone = structuredClone
  }
}
