/* This is a dummy module to mock the behavior of the cloudfront functions key value store helper library
which is only available in the functions execution environment */

const get = (key) => {
  if (key === "version"){
    return "v1.0.0"
  }

  if (key === "path") {
    return "/api"
  }

  if (key === "object") {
    return "file.ext"
  }
}

const cloudfront = {
  kvs: () => {
    return {
      get: get
    }
  }
}

export default cloudfront
