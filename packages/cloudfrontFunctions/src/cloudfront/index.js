/* This is a dummy module to mock the behavior of the cloudfront functions key value store helper library
which is only available in the functions execution environment */

const get = () => {
  return "v1.0.0"
}

const cloudfront = {
  kvs: () => {
    return {
      get: get
    }
  }
}

export default cloudfront
