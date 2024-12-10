/* This is a dummy module to mock the behavior of the cloudfront functions key value store helper library
which is only available in the functions execution environment */

const get = (key) => {
  if (key === "VERSION_PLACEHOLDER"){
    return "v1.0.0"
  }

  if (key === "PATH_PLACEHOLDER") {
    return "/api"
  }

  if (key === "OBJECT_PLACEHOLDER") {
    return "file.ext"
  }
  if (key === "BASEPATH_PLACEHOLDER") {
    return "/site"
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
