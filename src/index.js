import BaseWebAPI from './BaseWebAPI';
import hooks from './hooks';

export function objectToQueryString(params, paramMappings = {}) {
  // Maps internal query params to what they should be externally
  return Object.keys(params).map((key) => {
    const queryKey = !paramMappings[key] ? key : paramMappings[key];
    return [queryKey, params[key]].join('=');
  }).join('&');
}

export function remapParams(params, paramMappings) {
  // Maps internal query params to what they should be externally
  let mappedParams = {};

  Object.keys(params).forEach((key) => {
    const queryKey = !paramMappings[key] ? key : paramMappings[key];
    mappedParams[queryKey] = params[key];
  });

  return mappedParams;
}

export function createAPI(apiClass, options) {
  return new apiClass(options);
}

export {
  BaseWebAPI,
  hooks
};
