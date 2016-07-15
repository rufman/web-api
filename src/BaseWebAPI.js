import parseURL from 'url-parse';

import { objectToQueryString } from './index';
import { sortAfter, sortBefore } from './hooks';
import createRequest from './createRequest';

require('isomorphic-fetch');
require('es6-promise').polyfill();

class BaseWebAPI {
  constructor(options, config = {}) {
    const {
      baseEndpointURL = '',
      headers = {},
      host = 'localhost',
      protocol = 'https'
    } = options;

    this._configSetUp(config);

    this.globalHeaders = headers;
    this.host = host.replace('/', '');
    this.baseEndpointURL = baseEndpointURL.replace(/^\/|\/$/g, '');
    this.protocol = protocol.replace('://', '');

    this.baseURL = baseEndpointURL ?
     `${this.protocol}://${this.host}/${this.baseEndpointURL}` :
     `${this.protocol}://${this.host}`

    this.hooks = {
      after: [],
      before: [],
      error: []
    };

    this._executionList = [
      this._preProcessRequest,
      this._executeRequest,
      this._errorProcessResponse,
      this._unpackResponse,
      this._postProcessResponse
    ];


    this._requestTransformations = [];
    this._responseTransformations = [];
    this._errorTransformations = [];
  }

  async get(url, options, reqOptions = null) {
    this.clearRequestContext();
    return this.fetchRequest(createRequest('GET', this, url, options, reqOptions));
  }

  async post(url, options, reqOptions = null) {
    this.clearRequestContext();
    return this.fetchRequest(createRequest('POST', this, url, options, reqOptions));
  }

  async put(url, options, reqOptions = null) {
    this.clearRequestContext();
    return this.fetchRequest(createRequest('PUT', this, url, options, reqOptions));
  }

  async delete(url, options, reqOptions = null) {
    this.clearRequestContext();
    return this.fetchRequest(createRequest('DELETE', this, url, options, reqOptions));
  }

  _configSetUp(config) {
    if (!config) return;

    const {
      afterRequest = this.afterRequest,
      beforeRequest = this.beforeRequest,
      clearRequestContext = this.clearRequestContext,
      errorRequest = this.errorRequest,
      fetchRequest = this.fetchRequest,
      runHooks = this.runHooks
    } = config;

    this._afterRequest = this.afterRequest;
    this._beforeRequest = this.beforeRequest;
    this._clearRequestContext = this.clearRequestContext,
    this._errorRequest = this.errorRequest;
    this._fetchRequest = this.fetchRequest;
    this._runHooks = this.runHooks;
    this.afterRequest = afterRequest;
    this.beforeRequest = beforeRequest;
    this.clearRequestContext = clearRequestContext,
    this.errorRequest = errorRequest;
    this.fetchRequest = fetchRequest;
    this.runHooks = runHooks;
  }

  async fetchRequest(req) {
    let returnValue = req;
    for (const func of this._executionList) {
      ({ returnValue, req = req } = await func.call(this, returnValue, req));
    }

    return returnValue;
  }

  _preProcessRequest(req) {
    const originalRequest =  {...req};

    // Execute any before hooks
    req = this.beforeRequest(req);

    req.fetchUrl = `${req.url}`;
    if (req.queryParams && Object.keys(req.queryParams).length) {
      req.fetchUrl += `?${objectToQueryString(
        req.queryParams, req.queryParamMappings)}`;
    }

    return {returnValue: req};
  }

  async _executeRequest(req) {
    return {returnValue: await fetch(req.fetchUrl, req.params), req: req};
  }

  async _unpackResponse(response) {
     return {returnValue: await response.json()};
  }

  _errorProcessResponse(response, originalRequest) {
    if (!response.ok) {
      const unpackedResponse = this._unpackResponse(response);
      // Run through error hooks and throw the Error with the message
      // being the jsonified response given by the error hook(s)
      const errorResponse =
        this.errorRequest(unpackedResponse, response, originalRequest);
      if (errorResponse) {
        throw Error(JSON.stringify(response));
      }
    }

    return {returnValue: response};
  }

  _postProcessResponse(unpackedResponse, originalRequest) {
    // Execute after request hooks
    const processedJson = this.afterRequest(unpackedResponse, originalRequest);

    processedJson._metadata = {
      baseEndpointURL       : this.baseEndpointURL,
      baseURL               : this.baseURL,
      requestTranformations : this._requestTransformations,
      responseTranformations: this._responseTransformations,
      parsedRequestURL      : parseURL(originalRequest.fetchUrl)
    };

    return {returnValue: processedJson};
  }

  runHooks(params) {
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

  beforeRequest(req) {
    return this.runHooks({
      hooks                : this.hooks.before,
      sort                 : sortBefore,
      transformationHistory: this._requestTransformations,
      transformationObj    : req,
      transformType        : 'request',
      type                 : 'before'
    });
  }

  afterRequest(res, req) {
    return this.runHooks({
      hooks                : this.hooks.after,
      secondaryObjs        : [req],
      sort                 : sortAfter,
      transformationHistory: this._responseTransformations,
      transformationObj    : res,
      transformType        : 'response',
      type                 : 'after'
    });
  }

  errorRequest(jsonRes, res, req) {
    return this.runHooks({
      hooks                : this.hooks.error,
      secondaryObjs        : [res, req],
      sort                 : sortAfter,
      transformationHistory: this._errorTransformations,
      transformationObj    : jsonRes,
      transformType        : 'response',
      type                 : 'error'
    });
  }

  clearRequestContext() {
    this._requestTransformations = [];
    this._responseTransformations = [];
    this._errorTransformations = [];
  }

}

export default BaseWebAPI;
