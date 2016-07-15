export default function createRequest(method, source, url,
                                      options = {}, reqOptions = {}) {
  const {
    queryParams = {},
    queryParamMappings = {},
    params = {}
  } = options;

  let fullUrl = source.baseURL + url;

  params.method = method.toUpperCase();
  params.headers = {...params.headers, ...source.globalHeaders};

  return {
    params            : params,
    queryParams       : queryParams,
    queryParamMappings: queryParamMappings,
    reqOptions        : reqOptions,
    url               : fullUrl,
    fetchUrl          : ''
  }
}
