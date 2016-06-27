import { objectToQueryString } from './index';
import { sortAfter, sortBefore } from './hooks';
import fetch from 'isomorphic-fetch';
import parseURL from 'url-parse';

import es6Promise from 'es6-promise';

es6Promise.polyfill();

class BaseWebAPI {
  constructor(options) {
    const {
      baseEndpointURL = '',
      headers = {},
      host = '',
      protocol = 'http'
    } = options;

    this.globalHeaders = headers;
    this.host = host.replace('/', '');
    this.baseEndpointURL = baseEndpointURL.replace(/^\/|\/$/g, '');
    this.protocol = protocol.replace('://', '');

    this.baseURL = `${this.protocol}://${this.host}/${this.baseEndpointURL}`;
    this.hooks = {
      after: [],
      before: [],
      error: []
    };

    this._requestTransformations = [];
    this._responseTransformations = [];
    this._errorTransformations = [];
  }

  async _fetchRequest(req) {
    const originalRequest =  {...req};

    // Execute any before hooks
    req = this._beforeRequest(req);

    let fullUrl = `${req.url}`;
    if (req.queryParams) {
      fullUrl += `?${objectToQueryString(req.queryParams)}`;
    }

    let jsonResponse;
    if (!req.__skipRequest) {
      let response;
      response = await fetch(fullUrl, req.params);

      jsonResponse = await response.json();

      if (!response.ok) {
        // Run through error hooks and throw the Error with the message
        // being the jsonified response given by the error hook(s)
        jsonResponse = this._errorRequest(jsonResponse, response, originalRequest);
        if (!jsonResponse || !jsonResponse.__isResolved) {
          throw Error(JSON.stringify(jsonResponse));
        }
      }
    } else {
      jsonResponse = req.response;
    }

    // Execute after request hooks
    const processedJson = this._afterRequest(jsonResponse, originalRequest);

    processedJson._metadata = {
      baseEndpointURL       : this.baseEndpointURL,
      baseURL               : this.baseURL,
      requestTranformations : this._requestTransformations,
      responseTranformations: this._responseTransformations,
      parsedRequestURL      : parseURL(fullUrl)
    };

    return processedJson;
  }

  _runHooks(params) {
    const {
      hooks,
      secondaryObjs = [],
      sort,
      transformationHistory,
      transformationObj,
      transformType,
      type
    } = params;

     // Sort hooks
    hooks.sort(sort);

    let newObj = {...transformationObj};

    hooks.forEach((hook) => {
      const preTransformObj = Object.create({id: hook.id});
      preTransformObj[transformType] = transformationObj;
      transformationHistory.push(preTransformObj);

      newObj = hook[type].call(this, newObj, ...secondaryObjs);
    });

    return newObj;
  }

  _beforeRequest(req) {
    return this._runHooks({
      hooks                : this.hooks.before,
      sort                 : sortBefore,
      transformationHistory: this._requestTransformations,
      transformationObj    : req,
      transformType        : 'request',
      type                 : 'before'
    });
  }

  _afterRequest(res, req) {
    return this._runHooks({
      hooks                : this.hooks.after,
      secondaryObjs        : [req],
      sort                 : sortAfter,
      transformationHistory: this._responseTransformations,
      transformationObj    : res,
      transformType        : 'response',
      type                 : 'after'
    });
  }

  _errorRequest(jsonRes, res, req) {
    return this._runHooks({
      hooks                : this.hooks.error,
      secondaryObjs        : [res, req],
      sort                 : sortAfter,
      transformationHistory: this._errorTransformations,
      transformationObj    : jsonRes,
      transformType        : 'response',
      type                 : 'error'
    });
  }

  _clearRequestContext() {
    this._requestTransformations = [];
    this._responseTransformations = [];
    this._errorTransformations = [];
  }

  async get(url, options, reqOptions) {
    this._clearRequestContext();
    return this._fetchRequest(_createRequest('GET', this, url, options, reqOptions));
  }

  async post(url, options, reqOptions) {
    this._clearRequestContext();
    return this._fetchRequest(_createRequest('POST', this, url, options, reqOptions));
  }

  async put(url, options, reqOptions) {
    this._clearRequestContext();
    return this._fetchRequest(_createRequest('PUT', this, url, options, reqOptions));
  }

  async delete(url, options, reqOptions) {
    this._clearRequestContext();
    return this._fetchRequest(_createRequest('DELETE', this, url, options, reqOptions));
  }

}

function _createRequest(method, source, url, options, reqOptions = {}) {
  const {
    queryParams = {},
    queryParamMappings = {},
    params = {},
    body = {}
  } = options;

  let fullUrl = source.baseURL + url;

  params.method = method.toUpperCase();
  params.headers = {...params.headers, ...source.globalHeaders};
  params.body = body;

  return {
    params            : params,
    queryParams       : queryParams,
    queryParamMappings: queryParamMappings,
    reqOptions        : reqOptions,
    url               : fullUrl
  }
}

export default BaseWebAPI;
