// node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify: Netlify2, process: process2 } = globalThis;
  return Netlify2?.env ?? Deno?.env ?? {
    delete: (key) => delete process2?.env[key],
    get: (key) => process2?.env[key],
    has: (key) => Boolean(process2?.env[key]),
    set: (key, value) => {
      if (process2?.env) {
        process2.env[key] = value;
      }
    },
    toObject: () => process2?.env ?? {}
  };
};

// node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// node_modules/@netlify/blobs/dist/chunk-SQCJ2S3G.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context, responseBody) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
    if (context.edgeAccess) {
      return summary;
    }
    return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  let message = `Netlify Blobs has generated an internal error (${details})`;
  if (!res.headers.get(NF_ERROR) && responseBody) {
    message += `: ${responseBody}`;
  }
  return message;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}, responseBody) {
    super(blobsErrorMessage(res, context, responseBody));
    this.name = "BlobsInternalError";
    this.status = res.status;
    this.responseBody = responseBody;
  }
};
var createBlobsInternalError = async (res, context = {}) => {
  const responseBody = await res.clone().text().catch(() => void 0);
  return new BlobsInternalError(res, context, responseBody);
};
var discardBody = async (res) => {
  await res.body?.cancel().catch(() => {
  });
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var REGION_AUTO = "auto";
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
  try {
    const res = await fetch(url, options);
    const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
    if (attemptsLeft > 0 && isRetryable) {
      await discardBody(res);
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      const retryUrl = getRetryUrl ? await getRetryUrl() : url;
      return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    const retryUrl = getRetryUrl ? await getRetryUrl() : url;
    return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  /**
   * Whether requests reach Blobs through the edge rather than the API. Only
   * runtime environments are given an edge URL.
   */
  get edgeAccess() {
    return this.edgeURL !== void 0;
  }
  constructor({ apiURL, consistency, edgeURL, fetch, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
    let getRetryUrl;
    if (usesSignedUrl) {
      getRetryUrl = async () => {
        const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
        return finalRequest.url;
      };
    }
    return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var STATUS_CONFLICT = 409;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    await discardBody(res);
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "delete",
        storeName: this.name
      });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        await discardBody(res);
        throw new BlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "delete",
          storeName: this.name
        });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200) {
        await discardBody(res);
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      await discardBody(res);
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        await discardBody(res);
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      await discardBody(res);
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        if (res.status === STATUS_PRE_CONDITION_FAILED || res.status === STATUS_CONFLICT) {
          await discardBody(res);
          return { modified: false };
        }
        if (res.ok) {
          await discardBody(res);
          return { etag, modified: true };
        }
        throw await createBlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "put",
          storeName: this.name
        });
      }
      if (res.status === STATUS_OK) {
        await discardBody(res);
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        if (res.status === STATUS_PRE_CONDITION_FAILED || res.status === STATUS_CONFLICT) {
          await discardBody(res);
          return { modified: false };
        }
        if (res.ok) {
          await discardBody(res);
          return { etag, modified: true };
        }
        throw await createBlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "put",
          storeName: this.name
        });
      }
      if (res.status === STATUS_OK) {
        await discardBody(res);
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                await discardBody(res);
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                await discardBody(res);
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getDeployStoreRegion = (clientOptions, context) => {
  if (clientOptions.region) {
    return clientOptions.region;
  }
  if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
    if (!context.primaryRegion) {
      throw new Error(
        "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
      );
    }
    return context.primaryRegion;
  }
  return REGION_AUTO;
};
var getDeployStore = (input = {}, options) => {
  const context = getEnvironmentContext();
  const mergedOptions = typeof input === "string" ? { ...options, name: input } : input;
  const deployID = mergedOptions.deployID ?? context.deployID;
  if (!deployID) {
    throw new MissingBlobsEnvironmentError(["deployID"]);
  }
  const clientOptions = getClientOptions(mergedOptions, context);
  clientOptions.region = getDeployStoreRegion(clientOptions, context);
  const client = new Client(clientOptions);
  return new Store({ client, deployID, name: mergedOptions.name });
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const context = getEnvironmentContext();
    const clientOptions = getClientOptions(input, context);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    clientOptions.region = getDeployStoreRegion(clientOptions, context);
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// src/anmeldung.mjs
var PLAETZE = 15;
var plaetzeVon = (t) => t && t.plaetze || PLAETZE;
var PRAEVENTION = {
  di18: { titel: "Hatha Yoga", von: "2027-01-19", bis: "2027-03-09", preis: 160 },
  di1930: { titel: "Yin Yoga", von: "2027-01-19", bis: "2027-03-09", preis: 160 }
};
var PRAEVENTION_LINK = "/praeventionskurse-wedemark#anmeldung";
var KURS = {};
var kursVon = (t) => {
  const p = t && PRAEVENTION[t.id];
  return p && t.datum >= p.von && t.datum <= p.bis ? Math.min(KURS[t.id] || 0, plaetzeVon(t)) : 0;
};
var frei = (t) => Math.max(0, plaetzeVon(t) - kursVon(t));
var FRIST_STUNDEN = 12;
var MINDEST = 5;
var AUFBEWAHRUNG_TAGE = 28;
var STUNDEN = [
  { id: "di18", tag: 2, start: "18:00", ende: "19:15", titel: "Hatha meets Yin" },
  { id: "di1930", tag: 2, start: "19:30", ende: "20:30", titel: "Yin Yoga" },
  { id: "do1815", tag: 4, start: "18:15", ende: "19:30", titel: "Hatha Kraft & Stabilit\xE4t" },
  // Sonderabend: eigenes Datum, Anmeldung ab sofort, verbindlich (keine Abmeldung), Zuzahlung bar im Voraus.
  // Ersetzt an diesem Tag die normalen Dienstagsstunden.
  {
    id: "rn1512",
    tag: 2,
    start: "18:30",
    ende: "20:00",
    titel: "Rauhn\xE4chte-Abend",
    daten: ["2026-12-15"],
    verbindlich: true,
    plaetze: 18,
    arten: ["Karte", "KarteHansefit", "Kartenkauf vor Ort"],
    ersetzt: ["di18", "di1930"]
  }
];
var VERBINDLICH_HINWEIS = "Deine Anmeldung f\xFCr diesen Abend ist verbindlich. Wenn du nicht kommen kannst, darfst du deinen Platz an jemand anderen weitergeben. Schreib mir dann kurz, wer kommt.";
var INFO_KURSE = [
  { id: "aroha", titel: "AROHA", start: "18:00", ende: "18:50", zusatz: "YAP \u2013 YOUR Active Place, H\xF6pershof", link: "https://www.fyndery.de/wedemark/kurs/40994/effektiver-gesundheitskurs-fuer-straffere-muskeln-und-innere-balance/?ref=7239", linkText: "Bei Fyndery buchen" },
  { id: "faszien", online: true, titel: "FaszienFit", start: "09:00", ende: "09:40", zusatz: "live online", link: "https://www.fyndery.de/online/kurs/16842/faszienfit-yoga-beweglich-stabil/?ref=7239", linkText: "Bei Fyndery buchen" },
  { id: "yinonline", online: true, titel: "Yin Yoga live online", start: "19:30", ende: "20:30", zusatz: "\xFCber Zoom", link: "https://www.fyndery.de/online/kurs/6261/yin-yoga-live-online/?ref=7239", linkText: "Bei Fyndery buchen" },
  {
    id: "praevonline",
    online: true,
    titel: "Pr\xE4ventionskurs Hatha Yoga",
    start: "09:00",
    ende: "10:00",
    zusatz: "live online",
    fest: { von: "2027-01-17", bis: "2027-03-07", text: "Sonntags, 17.01. bis 07.03.2027 \xB7 8 Termine \xB7 160 \u20AC" },
    link: "https://alfima.com/bettinakahmann/hatha-yoga-praeventionskurs-online",
    linkText: "Zum Pr\xE4ventionskurs"
  },
  { id: "morning", online: true, titel: "Morning Energy Yoga", start: "09:00", zusatz: "live online", link: "https://www.fyndery.de/online/kurs/16133/morning-energy-yoga-ist-eine-vitalisierende-online-yogastunde/?ref=7239", linkText: "Bei Fyndery buchen" }
];
var ANMELDE_TAGE = 6;
var PLAN_KEY = "plan";
var START_PLAN = {
  di18: ["2026-11-17", "2026-11-24", "2026-12-01", "2026-12-08", "2026-12-15"],
  di1930: ["2026-11-17", "2026-11-24", "2026-12-01", "2026-12-08", "2026-12-15"],
  do1815: ["2026-11-19", "2026-12-03", "2026-12-10", "2026-12-17"],
  aroha: ["2026-11-18", "2026-11-25", "2026-12-02", "2026-12-09", "2026-12-16"],
  faszien: ["2026-11-24", "2026-12-08"],
  yinonline: ["2026-11-18", "2026-11-25", "2026-12-02", "2026-12-09", "2026-12-16"],
  morning: ["2026-11-15", "2026-11-22", "2026-12-06", "2026-12-20", "2026-12-27"]
};
var PLAN = START_PLAN;
var ARTEN = ["Karte", "KarteHansefit", "Kartenkauf vor Ort", "epassi/Hansefit", "Einzelstunde", "Schnupperstunde", "Schnupperstunde Hansefit/epassi"];
var VOR_ORT = "Kartenkauf vor Ort";
var gleicherName = (a, b) => String(a).toLowerCase().replace(/\s+/g, " ").trim() === String(b).toLowerCase().replace(/\s+/g, " ").trim();
var ARTEN_ADMIN = ["epassi/Hansefit", "Einzelstunde", "Schnupperstunde", "Schnupperstunde Hansefit/epassi", "Fyndery"];
var KARTEN = { "5er": { stunden: 5, monate: 6 }, "10er": { stunden: 10, monate: 12 } };
var KARTEN_KEY = "karten";
var KARTEN_LOESCHEN_MONATE = 6;
var CODE_ZEICHEN = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var PREISE = { "5er": 90, "10er": 160 };
var STICHTAG_VERFALL = "2026-11-15";
var GUTSCHEIN_OFFEN_TAGE = 30;
var WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
var PRODUKTION = true;
var store = () => PRODUKTION ? getStore({ name: "wochen-anmeldung", consistency: "strong" }) : getDeployStore({ name: "wochen-anmeldung", consistency: "strong" });
var VORSCHAU_SCHLUESSEL = "vorschau-bettina";
var json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
function jetztBerlin() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(/* @__PURE__ */ new Date()).map((x) => [x.type, x.value])
  );
  return { datum: `${p.year}-${p.month}-${p.day}`, zeit: `${p.hour}:${p.minute}` };
}
function plusTage(datum, n) {
  const d = /* @__PURE__ */ new Date(datum + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
var wochentag = (datum) => (/* @__PURE__ */ new Date(datum + "T12:00:00Z")).getUTCDay();
async function ladePlan(st) {
  const r = await st.getWithMetadata(PLAN_KEY, { type: "json" });
  return { doc: r ? r.data : { termine: JSON.parse(JSON.stringify(START_PLAN)) }, etag: r ? r.etag : null };
}
var nachZeit = (a, b) => (a.datum + a.start).localeCompare(b.datum + b.start);
function kommt(d, start) {
  const { datum, zeit } = jetztBerlin();
  return d > datum || d === datum && zeit < start;
}
function geplante(kurse) {
  const out = [];
  const ersetzt = (id, d) => kurse.some((x) => x.daten && x.daten.includes(d) && (x.ersetzt || []).includes(id));
  for (const s of kurse) for (const d of s.daten || PLAN[s.id] || []) if (!ersetzt(s.id, d)) out.push({ ...s, datum: d, key: `s/${d}_${s.id}` });
  return out.sort(nachZeit);
}
function naechsteTermine() {
  const bis = plusTage(jetztBerlin().datum, ANMELDE_TAGE);
  return geplante(STUNDEN).filter((t) => kommt(t.datum, t.start) && (t.daten || t.datum <= bis));
}
function spaetereTermine() {
  const bis = plusTage(jetztBerlin().datum, ANMELDE_TAGE);
  const ende = plusTage(jetztBerlin().datum, 28);
  return geplante(STUNDEN).filter((t) => !t.daten && t.datum > bis && t.datum <= ende);
}
function vergangeneTermine(tage) {
  const von = plusTage(jetztBerlin().datum, -tage);
  return geplante(STUNDEN).filter((t) => !kommt(t.datum, t.start) && t.datum >= von);
}
function infoTermine() {
  return INFO_KURSE.map((k) => ({
    online: !!k.online,
    titel: k.titel,
    zeit: k.ende ? `${k.start}\u2013${k.ende}` : k.start,
    zusatz: k.zusatz,
    link: k.link || "",
    linkText: k.linkText || "",
    termine: k.fest ? kommt(k.fest.bis, k.start) ? [k.fest.text] : [] : (PLAN[k.id] || []).filter((d) => kommt(d, k.start)).sort().slice(0, 8).map(datumText)
  })).filter((k) => k.termine.length);
}
function minutenBis(datum, start) {
  const j = jetztBerlin();
  const ziel = Date.parse(`${datum}T${start}:00Z`), jetzt = Date.parse(`${j.datum}T${j.zeit}:00Z`);
  return (ziel - jetzt) / 6e4;
}
var imFristfenster = (t) => minutenBis(t.datum, t.start) < FRIST_STUNDEN * 60;
var terminAusKey = (key) => {
  const m = /^s\/(\d{4}-\d{2}-\d{2})_([a-z0-9]+)$/.exec(key);
  const s = m && STUNDEN.find((x) => x.id === m[2]);
  return s ? { ...s, datum: m[1], key } : null;
};
var datumText = (d) => {
  const [y, m, t] = d.split("-");
  return `${WT[wochentag(d)]}, ${t}.${m}.`;
};
async function lade(st, key) {
  const r = await st.getWithMetadata(key, { type: "json" });
  const doc = r ? r.data : { eintraege: [], ausfall: false };
  doc.spaet = doc.spaet || [];
  return { doc, etag: r ? r.etag : null };
}
async function aendern(st, key, fn, loader = lade) {
  for (let v = 0; v < 6; v++) {
    const { doc, etag } = await loader(st, key);
    const ergebnis = fn(doc);
    if (ergebnis && (ergebnis.fehler || ergebnis.unveraendert)) return ergebnis;
    const opt = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const w = await st.setJSON(key, doc, opt);
    if (w.modified) return ergebnis;
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
  }
  return { fehler: "Gerade ist viel los. Bitte versuch es gleich noch einmal." };
}
async function sha(text2) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text2));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var zufall = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
function oeffentlich(t, doc, eigeneIds) {
  const n = doc.eintraege.length;
  const res = {
    key: t.key,
    id: t.id,
    titel: t.titel,
    datum: t.datum,
    datumText: datumText(t.datum),
    zeit: `${t.start}\u2013${t.ende}`,
    plaetze: plaetzeVon(t),
    angemeldet: Math.min(n + kursVon(t), plaetzeVon(t)),
    warteliste: Math.max(0, n - frei(t)),
    kurs: kursVon(t),
    ausfall: !!doc.ausfall,
    kostenpflichtig: !t.verbindlich && imFristfenster(t),
    fristStunden: FRIST_STUNDEN,
    mindest: MINDEST,
    bestaetigt: !!doc.bestaetigt,
    findetStatt: !doc.ausfall && (!!t.verbindlich || !!doc.bestaetigt || n + kursVon(t) >= MINDEST),
    verbindlich: !!t.verbindlich,
    arten: t.arten || null
  };
  if (eigeneIds.length) {
    res.eigene = {};
    doc.eintraege.forEach((e, i) => {
      if (eigeneIds.includes(e.id)) res.eigene[e.id] = i < frei(t) ? { status: "platz" } : { status: "warteliste", position: i - frei(t) + 1 };
    });
  }
  return res;
}
async function aufraeumen(st) {
  const grenze = plusTage(jetztBerlin().datum, -AUFBEWAHRUNG_TAGE);
  const { blobs } = await st.list({ prefix: "s/" });
  for (const b of blobs) if (b.key.slice(2, 12) < grenze) await st.delete(b.key);
}
function istAdmin(req) {
  let soll = process.env.ANMELDUNG_KEY || (typeof Netlify !== "undefined" ? Netlify.env.get("ANMELDUNG_KEY") : "");
  if (!PRODUKTION) soll = VORSCHAU_SCHLUESSEL;
  const ist = req.headers.get("x-anmeldung-key") || "";
  return !!soll && soll.length >= 12 && ist === soll;
}
async function ladeKarten(st) {
  const r = await st.getWithMetadata(KARTEN_KEY, { type: "json" });
  const doc = r ? r.data : { karten: [] };
  doc.gutscheine = doc.gutscheine || [];
  return { doc, etag: r ? r.etag : null };
}
function plusMonate(datum, n) {
  const [y, m, d] = datum.split("-").map(Number);
  const z = new Date(Date.UTC(y, m - 1 + n, d));
  return z.toISOString().slice(0, 10);
}
var rest = (k) => k.stunden + k.buchungen.reduce((a, b) => a + b.delta, 0);
var neuerCode = (karten) => {
  for (; ; ) {
    const c = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => CODE_ZEICHEN[b % CODE_ZEICHEN.length]).join("");
    if (!karten.some((k) => k.code === c)) return c;
  }
};
var normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
var datumDE = (d) => d.split("-").reverse().join(".");
function stattgefunden(doc) {
  return !doc.ausfall;
}
var begonnen = (t) => minutenBis(t.datum, t.start) <= 0;
async function abrechnen(st) {
  const { blobs } = await st.list({ prefix: "s/" });
  const sitzungen = [];
  for (const b of blobs) {
    const t = terminAusKey(b.key);
    if (!t || !t.verbindlich && !begonnen(t)) continue;
    const { doc } = await lade(st, b.key);
    const soll = [];
    if (stattgefunden(doc)) {
      doc.eintraege.slice(0, frei(t)).forEach((e) => e.kartenId && soll.push({ kartenId: e.kartenId, eintrag: e.id, art: "Teilnahme" }));
      doc.spaet.forEach((e) => e.kartenId && !e.erlassen && soll.push({ kartenId: e.kartenId, eintrag: e.id, art: "Sp\xE4te Absage", delta: /Hansefit/.test(e.art) ? -2 : -1 }));
    }
    sitzungen.push({ t, soll });
  }
  if (!sitzungen.length) return;
  await aendern(st, KARTEN_KEY, (doc) => {
    const vorher = JSON.stringify(doc.karten);
    for (const k of doc.karten) {
      for (const { t, soll } of sitzungen) {
        k.buchungen = k.buchungen.filter((b) => b.key !== t.key);
        soll.filter((x) => x.kartenId === k.id).forEach(
          (x) => k.buchungen.push({ key: t.key, datum: t.datum, titel: t.titel, art: x.art, delta: x.delta || -1, eintrag: x.eintrag })
        );
      }
      k.buchungen.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    }
    return JSON.stringify(doc.karten) === vorher ? { unveraendert: true } : { ok: true };
  }, ladeKarten);
}
var gutscheinGueltig = (bestellt) => `${Number(bestellt.slice(0, 4)) + 3}-12-31`;
var alleCodes = (doc) => [...doc.karten, ...doc.gutscheine];
function einloesen(doc, g, heute) {
  const karte = {
    id: zufall(8),
    code: g.code,
    name: g.fuer,
    typ: g.typ,
    stunden: KARTEN[g.typ].stunden,
    gekauft: heute,
    gueltigBis: plusMonate(heute, KARTEN[g.typ].monate),
    buchungen: [],
    ausGutschein: g.id
  };
  doc.karten.push(karte);
  g.status = "eingeloest";
  g.eingeloest = heute;
  g.kartenId = karte.id;
  return karte;
}
function gutscheinAdmin(g) {
  return {
    id: g.id,
    code: g.code,
    typ: g.typ,
    preis: PREISE[g.typ],
    zahlart: g.zahlart || "alfima",
    fuer: g.fuer,
    von: g.von,
    email: g.email,
    gruss: g.gruss,
    status: g.status,
    bestellt: g.bestellt,
    bezahlt: g.bezahlt || null,
    eingeloest: g.eingeloest || null,
    gueltigBis: g.gueltigBis
  };
}
var text = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
function karteAdmin(k) {
  const heute = jetztBerlin().datum;
  return {
    id: k.id,
    name: k.name,
    typ: k.typ,
    code: k.code,
    stunden: k.stunden,
    gekauft: k.gekauft,
    gueltigBis: k.gueltigBis,
    abgelaufen: k.gueltigBis < heute,
    rest: rest(k),
    buchungen: k.buchungen
  };
}
var anmeldung_default = async (req, context) => {
  const ctx = context?.deploy?.context;
  PRODUKTION = !ctx || ctx === "production";
  const st = store();
  const url = new URL(req.url);
  let planDoc = (await ladePlan(st)).doc;
  if (!planDoc.praeventionTermine) {
    await aendern(st, PLAN_KEY, (doc) => {
      if (doc.praeventionTermine) return { unveraendert: true };
      for (const [id, p] of Object.entries(PRAEVENTION)) {
        const l = new Set(doc.termine[id] || []);
        for (let d = p.von; d <= p.bis; d = plusTage(d, 7)) l.add(d);
        doc.termine[id] = [...l].sort();
      }
      doc.praeventionTermine = true;
      return { ok: true };
    }, ladePlan);
    planDoc = (await ladePlan(st)).doc;
  }
  PLAN = planDoc.termine;
  KURS = planDoc.praevention || {};
  if (req.method === "GET") {
    if (url.searchParams.get("admin") === "1") {
      if (!istAdmin(req)) return json({ fehler: "Schl\xFCssel stimmt nicht." }, 401);
      await abrechnen(st);
      const kartenDoc = (await ladeKarten(st)).doc;
      const restVon = (id) => {
        const k = id && kartenDoc.karten.find((x) => x.id === id);
        return k ? rest(k) : null;
      };
      const nameVon = (id) => {
        const k = id && kartenDoc.karten.find((x) => x.id === id);
        return k ? k.name : null;
      };
      const termine = [...naechsteTermine(), ...vergangeneTermine(14)];
      const liste = [];
      for (const t of termine) {
        const { doc } = await lade(st, t.key);
        liste.push({
          key: t.key,
          titel: t.titel,
          datum: t.datum,
          datumText: datumText(t.datum),
          zeit: `${t.start}\u2013${t.ende}`,
          kommend: t.datum >= jetztBerlin().datum && naechsteTermine().some((x) => x.key === t.key),
          ausfall: !!doc.ausfall,
          bestaetigt: !!doc.bestaetigt,
          mindest: MINDEST,
          plaetze: plaetzeVon(t),
          kurs: kursVon(t),
          verbindlich: !!t.verbindlich,
          eintraege: doc.eintraege.map((e, i) => ({ id: e.id, name: e.name, art: e.art, ts: e.ts, warteliste: i >= frei(t), kartenRest: restVon(e.kartenId), kartenName: nameVon(e.kartenId), email: e.email || "", bezahlt: !!e.bezahlt })),
          spaet: doc.spaet.map((e) => ({ id: e.id, name: e.name, kartenName: nameVon(e.kartenId), art: e.art, abgesagt: e.abgesagt, erlassen: !!e.erlassen }))
        });
      }
      return json({ termine: liste });
    }
    if (url.searchParams.get("karten") === "1") {
      if (!istAdmin(req)) return json({ fehler: "Schl\xFCssel stimmt nicht." }, 401);
      await abrechnen(st);
      const grenze = plusMonate(jetztBerlin().datum, -KARTEN_LOESCHEN_MONATE);
      await aendern(st, KARTEN_KEY, (doc2) => {
        doc2.karten = doc2.karten.filter((k) => k.gueltigBis >= grenze);
        return { ok: true };
      }, ladeKarten);
      const { doc } = await ladeKarten(st);
      return json({ karten: doc.karten.map(karteAdmin).sort((a, b) => a.name.localeCompare(b.name, "de")) });
    }
    if (url.searchParams.has("gutschein")) {
      const code = normCode(url.searchParams.get("gutschein"));
      const g = (await ladeKarten(st)).doc.gutscheine.find((x) => x.code === code && x.status !== "offen");
      if (!g) return json({ fehler: "Diesen Gutschein gibt es nicht oder er ist noch nicht freigegeben." }, 404);
      return json({
        code: g.code,
        typ: g.typ,
        stunden: KARTEN[g.typ].stunden,
        monate: KARTEN[g.typ].monate,
        fuer: g.fuer,
        von: g.von,
        gruss: g.gruss,
        gueltigBis: datumDE(g.gueltigBis),
        eingeloest: g.status === "eingeloest"
      });
    }
    if (url.searchParams.get("gutscheine") === "1") {
      if (!istAdmin(req)) return json({ fehler: "Schl\xFCssel stimmt nicht." }, 401);
      const grenze = plusTage(jetztBerlin().datum, -GUTSCHEIN_OFFEN_TAGE);
      await aendern(st, KARTEN_KEY, (doc2) => {
        const n = doc2.gutscheine.length;
        const heute = jetztBerlin().datum;
        doc2.gutscheine = doc2.gutscheine.filter((g) => g.status === "offen" ? g.bestellt >= grenze : g.status === "bezahlt" ? g.gueltigBis >= heute : g.eingeloest >= plusMonate(heute, -18));
        return doc2.gutscheine.length === n ? { unveraendert: true } : { ok: true };
      }, ladeKarten);
      const { doc } = await ladeKarten(st);
      return json({ gutscheine: doc.gutscheine.map(gutscheinAdmin).sort((a, b) => b.bestellt.localeCompare(a.bestellt)) });
    }
    if (url.searchParams.has("karte")) {
      const code = normCode(url.searchParams.get("karte"));
      if (code.length < 6) return json({ fehler: "Bitte gib deinen Kartencode ein." }, 400);
      await abrechnen(st);
      const kd = (await ladeKarten(st)).doc;
      const gs = kd.gutscheine.find((x) => x.code === code && x.status === "bezahlt");
      if (gs) return json({ gutschein: true, vorname: gs.fuer.split(" ")[0], typ: gs.typ, stunden: KARTEN[gs.typ].stunden, monate: KARTEN[gs.typ].monate, gueltigBis: datumDE(gs.gueltigBis) });
      const k = kd.karten.find((x) => x.code === code);
      if (!k) return json({ fehler: "Diesen Kartencode gibt es nicht. Schau noch einmal nach oder frag mich." }, 404);
      const a = karteAdmin(k);
      return json({
        vorname: k.name.split(" ")[0],
        typ: k.typ,
        stunden: k.stunden,
        rest: a.rest,
        gueltigBis: datumDE(k.gueltigBis),
        abgelaufen: a.abgelaufen,
        uebertrag: k.gekauft < STICHTAG_VERFALL,
        verlauf: k.buchungen.map((b) => ({ datum: b.datum ? datumText(b.datum) : "", titel: b.titel || b.notiz || "Korrektur", art: b.art, delta: b.delta }))
      });
    }
    if (url.searchParams.get("plan") === "1") {
      if (!istAdmin(req)) return json({ fehler: "Schl\xFCssel stimmt nicht." }, 401);
      const heute = jetztBerlin().datum;
      return json({ kurse: [...STUNDEN.filter((s) => !s.daten).map((s) => ({ ...s, anmeldung: true })), ...INFO_KURSE.filter((s) => !s.fest).map((s) => ({ ...s, anmeldung: false }))].map((s) => ({
        id: s.id,
        titel: s.titel,
        zeit: s.ende ? `${s.start}\u2013${s.ende}` : s.start,
        anmeldung: s.anmeldung,
        termine: (PLAN[s.id] || []).filter((d) => d >= heute).sort().map((d) => ({ datum: d, text: datumText(d) })),
        ...PRAEVENTION[s.id] ? { praevention: { titel: PRAEVENTION[s.id].titel, von: datumDE(PRAEVENTION[s.id].von), bis: datumDE(PRAEVENTION[s.id].bis), anzahl: KURS[s.id] || 0, plaetze: plaetzeVon(s) } } : {}
      })) });
    }
    const ids = (url.searchParams.get("ids") || "").split(",").filter((x) => /^[a-f0-9]{16}$/.test(x)).slice(0, 20);
    const out = [];
    for (const t of naechsteTermine()) out.push(oeffentlich(t, (await lade(st, t.key)).doc, ids));
    const spaeter = spaetereTermine().map((t) => ({ datumText: datumText(t.datum), titel: t.titel, zeit: `${t.start}\u2013${t.ende}` }));
    const heuteP = jetztBerlin().datum;
    const praevention = Object.entries(PRAEVENTION).filter(([, p]) => heuteP < p.von).map(([id, p]) => {
      const s = STUNDEN.find((x) => x.id === id);
      return { titel: p.titel, tag: WT[wochentag(p.von)], zeit: `${s.start}\u2013${s.ende}`, von: datumDE(p.von), bis: datumDE(p.bis), preis: p.preis };
    });
    return json({ termine: out, spaeter, info: infoTermine(), praevention, praeventionLink: PRAEVENTION_LINK });
  }
  if (req.method !== "POST") return json({ fehler: "Methode nicht erlaubt." }, 405);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ fehler: "Ung\xFCltige Anfrage." }, 400);
  }
  if (body.action === "anmelden") {
    if (body.website) return json({ ok: true, id: "0".repeat(16), token: "x", status: "platz" });
    const t = naechsteTermine().find((x) => x.key === body.key);
    if (!t) return json({ fehler: "F\xFCr diese Stunde ist die Anmeldung geschlossen." }, 400);
    const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.length < 2) return json({ fehler: "Bitte trag deinen Namen ein." }, 400);
    if (!/\S+\s+\S+/.test(name)) return json({ fehler: "Bitte trag deinen Vor- und Nachnamen ein." }, 400);
    let art = ARTEN.includes(body.art) ? body.art : "";
    if (!art) return json({ fehler: "Bitte w\xE4hl aus, wie du teilnimmst." }, 400);
    if (t.arten && !t.arten.includes(art)) return json({ fehler: "F\xFCr diesen Abend meldest du dich hier mit deiner Karte an. Kommst du nur \xFCber Hansefit oder epassi, buchst du \xFCber bettina-kahmann.com/rauhnaechte mit dem Code hansefit12." }, 400);
    const email = t.verbindlich ? text(body.email, 120) : "";
    if (t.verbindlich && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ fehler: "Bitte trag deine E-Mail-Adresse ein. Dorthin schicke ich dir die Begleitung durch die Rauhn\xE4chte." }, 400);
    let karte = null;
    if (art === "Karte" || art === "KarteHansefit") {
      const code = normCode(body.code);
      karte = (await ladeKarten(st)).doc.karten.find((x) => x.code === code);
      if (!karte) {
        const r2 = await aendern(st, KARTEN_KEY, (doc) => {
          const g = doc.gutscheine.find((x) => x.code === code && x.status === "bezahlt");
          if (!g) return { fehler: "nicht" };
          if (g.gueltigBis < jetztBerlin().datum) return { fehler: "Dieser Gutschein ist abgelaufen. Sprich mich bitte an." };
          return { karte: einloesen(doc, g, jetztBerlin().datum) };
        }, ladeKarten);
        if (r2.fehler && r2.fehler !== "nicht") return json({ fehler: r2.fehler }, 400);
        karte = r2.karte || null;
      }
      if (!karte) return json({ fehler: "Diesen Kartencode gibt es nicht. Schau noch einmal nach oder frag mich in der WhatsApp-Gruppe." }, 400);
      art = `${karte.typ}-Karte` + (art === "KarteHansefit" ? " + Hansefit/epassi" : "");
    }
    const id = zufall(8), token = zufall(16), tokenHash = await sha(token);
    const r = await aendern(st, t.key, (doc) => {
      if (doc.ausfall) return { fehler: "Diese Stunde f\xE4llt aus." };
      if (doc.eintraege.length >= plaetzeVon(t) + 30) return { fehler: "Die Warteliste ist voll." };
      if (karte && doc.eintraege.some((e) => e.kartenId === karte.id)) return { fehler: "Mit dieser Karte bist du f\xFCr diese Stunde schon eingetragen." };
      doc.eintraege.push({ id, name, art, ts: (/* @__PURE__ */ new Date()).toISOString(), tokenHash, ...email ? { email } : {}, ...karte ? { kartenId: karte.id } : {} });
      const i = doc.eintraege.length - 1;
      return i < frei(t) ? { status: "platz" } : { status: "warteliste", position: i - frei(t) + 1 };
    });
    if (r.fehler) return json(r, 409);
    if (Math.random() < 0.1) aufraeumen(st).catch(() => {
    });
    let kartenInfo = {};
    if (karte) {
      await abrechnen(st).catch(() => {
      });
      const k = (await ladeKarten(st)).doc.karten.find((x) => x.id === karte.id);
      kartenInfo = { kartenRest: rest(k), kartenAbgelaufen: k.gueltigBis < jetztBerlin().datum };
    }
    return json({ ok: true, id, token, key: t.key, ...r, ...kartenInfo, verbindlich: !!t.verbindlich && r.status === "platz" });
  }
  if (body.action === "abmelden") {
    const tb = terminAusKey(String(body.key || ""));
    if (tb && begonnen(tb)) return json({ fehler: "Die Stunde hat schon begonnen." }, 409);
    const tokenHash = await sha(String(body.token || ""));
    const r = await aendern(st, String(body.key || ""), (doc) => {
      const i = doc.eintraege.findIndex((e2) => e2.id === body.id && e2.tokenHash === tokenHash);
      if (i < 0) return { fehler: "Anmeldung nicht gefunden." };
      const t = terminAusKey(String(body.key || ""));
      if (tb && tb.verbindlich && i < frei(tb)) return { fehler: VERBINDLICH_HINWEIS, verbindlich: true };
      const [e] = doc.eintraege.splice(i, 1);
      const fenster = !!t && imFristfenster(t);
      const spaet = fenster && i < frei(t) && !doc.ausfall;
      if (spaet) doc.spaet.push({ id: e.id, name: e.name, art: e.art, abgesagt: (/* @__PURE__ */ new Date()).toISOString(), ...e.kartenId ? { kartenId: e.kartenId } : {} });
      return { ok: true, spaet };
    });
    return json(r, r.fehler ? r.verbindlich ? 409 : 404 : 200);
  }
  if (body.action === "gutschein_bestellen") {
    if (body.website) return json({ ok: true });
    const typ = KARTEN[body.typ] ? body.typ : "";
    const fuer = text(body.fuer, 60), von = text(body.von, 60), email = text(body.email, 120), gruss = text(body.gruss, 160);
    const zahlart = body.zahlart === "bar" ? "bar" : "alfima";
    if (!typ) return json({ fehler: "Bitte w\xE4hl eine Karte aus." }, 400);
    if (fuer.length < 2) return json({ fehler: "Bitte trag ein, f\xFCr wen der Gutschein ist." }, 400);
    if (von.length < 2) return json({ fehler: "Bitte trag deinen Namen ein." }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ fehler: "Bitte trag deine E-Mail-Adresse ein. Dorthin schicke ich den Gutschein." }, 400);
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      if (doc.gutscheine.filter((g) => g.status === "offen").length >= 200) return { fehler: "Gerade sind zu viele Bestellungen offen. Schreib mir bitte direkt." };
      const heute = jetztBerlin().datum;
      doc.gutscheine.push({ id: zufall(8), code: neuerCode(alleCodes(doc)), typ, fuer, von, email, gruss, zahlart, status: "offen", bestellt: heute, gueltigBis: gutscheinGueltig(heute) });
      return { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 409 : 200);
  }
  if (!istAdmin(req)) return json({ fehler: "Schl\xFCssel stimmt nicht." }, 401);
  if (body.action === "gutschein_neu") {
    const typ = KARTEN[body.typ] ? body.typ : "";
    const fuer = text(body.fuer, 60), von = text(body.von, 60), gruss = text(body.gruss, 160), email = text(body.email, 120);
    if (!typ || fuer.length < 2) return json({ fehler: "Bitte Karte und Namen der beschenkten Person angeben." }, 400);
    let neu;
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const heute = jetztBerlin().datum;
      neu = { id: zufall(8), code: neuerCode(alleCodes(doc)), typ, fuer, von, email, gruss, zahlart: "bar", status: "bezahlt", bestellt: heute, bezahlt: heute, gueltigBis: gutscheinGueltig(heute) };
      doc.gutscheine.push(neu);
      return { ok: true };
    }, ladeKarten);
    return r.fehler ? json(r, 409) : json({ ok: true, gutschein: gutscheinAdmin(neu) });
  }
  if (body.action === "gutschein_bezahlt" || body.action === "gutschein_einloesen" || body.action === "gutschein_loeschen") {
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const g = doc.gutscheine.find((x) => x.id === body.id);
      if (!g) return { fehler: "Gutschein nicht gefunden." };
      if (body.action === "gutschein_loeschen") {
        if (g.status === "eingeloest") return { fehler: "Eingel\xF6ste Gutscheine bleiben, die Karte l\xE4uft schon." };
        doc.gutscheine = doc.gutscheine.filter((x) => x.id !== g.id);
        return { ok: true };
      }
      if (body.action === "gutschein_bezahlt") {
        if (g.status === "eingeloest") return { fehler: "Schon eingel\xF6st." };
        g.status = body.wert === false ? "offen" : "bezahlt";
        g.bezahlt = g.status === "bezahlt" ? jetztBerlin().datum : null;
        return { ok: true };
      }
      if (g.status !== "bezahlt") return { fehler: "Nur bezahlte Gutscheine lassen sich einl\xF6sen." };
      einloesen(doc, g, jetztBerlin().datum);
      return { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === "karte_neu") {
    const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 60);
    const typ = KARTEN[body.typ] ? body.typ : "";
    const gekauft = /^\d{4}-\d{2}-\d{2}$/.test(body.gekauft || "") ? body.gekauft : jetztBerlin().datum;
    const genutzt = Math.max(0, Math.min(KARTEN[typ]?.stunden || 0, parseInt(body.genutzt, 10) || 0));
    if (name.length < 2 || !typ) return json({ fehler: "Bitte Name und Kartenart angeben." }, 400);
    let neu;
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      neu = {
        id: zufall(8),
        code: neuerCode(alleCodes(doc)),
        name,
        typ,
        stunden: KARTEN[typ].stunden,
        gekauft,
        gueltigBis: plusMonate(gekauft, KARTEN[typ].monate),
        buchungen: []
      };
      if (genutzt) neu.buchungen.push({ datum: gekauft, notiz: "\xDCbertrag, bereits genutzt", art: "Korrektur", delta: -genutzt });
      const heute = jetztBerlin().datum;
      for (const alt of doc.karten) {
        const r0 = rest(alt);
        if (r0 < 0 && gleicherName(alt.name, name)) {
          alt.buchungen.push({ datum: heute, notiz: "\xDCbertrag auf neue Karte", art: "Korrektur", delta: -r0 });
          neu.buchungen.push({ datum: heute, notiz: "\xDCbertrag von alter Karte", art: "Korrektur", delta: r0 });
        }
      }
      doc.karten.push(neu);
      return { ok: true };
    }, ladeKarten);
    if (r.fehler) return json(r, 409);
    const von = plusTage(jetztBerlin().datum, -14);
    const { blobs } = await st.list({ prefix: "s/" });
    for (const b of blobs) {
      const t = terminAusKey(b.key);
      if (!t || t.datum < von) continue;
      await aendern(st, b.key, (doc) => {
        let n = 0;
        for (const e of [...doc.eintraege, ...doc.spaet]) {
          if (e.art === VOR_ORT && !e.kartenId && gleicherName(e.name, name)) {
            e.kartenId = neu.id;
            e.art = `${typ}-Karte`;
            n++;
          }
        }
        return n ? { ok: true } : { unveraendert: true };
      }).catch(() => {
      });
    }
    await abrechnen(st).catch(() => {
    });
    const aktuell = (await ladeKarten(st)).doc.karten.find((x) => x.id === neu.id) || neu;
    return json({ ok: true, karte: karteAdmin(aktuell) });
  }
  if (body.action === "karte_buchung") {
    const delta = parseInt(body.delta, 10);
    if (![-1, 1].includes(delta)) return json({ fehler: "Ung\xFCltige Korrektur." }, 400);
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const k = doc.karten.find((x) => x.id === body.kartenId);
      if (!k) return { fehler: "Karte nicht gefunden." };
      k.buchungen.push({ datum: jetztBerlin().datum, notiz: String(body.notiz || "").slice(0, 80) || (delta < 0 ? "Stunde ohne Anmeldung" : "Korrektur"), art: "Korrektur", delta });
      return { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === "karte_loeschen") {
    const r = await aendern(st, KARTEN_KEY, (doc) => {
      const n = doc.karten.length;
      doc.karten = doc.karten.filter((x) => x.id !== body.kartenId);
      return n === doc.karten.length ? { fehler: "Karte nicht gefunden." } : { ok: true };
    }, ladeKarten);
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === "plan_kurs") {
    const p = PRAEVENTION[body.id];
    const anzahl = Number(body.anzahl);
    if (!p || !Number.isInteger(anzahl) || anzahl < 0 || anzahl > PLAETZE) return json({ fehler: `Bitte eine Zahl von 0 bis ${PLAETZE} eintragen.` }, 400);
    const r = await aendern(st, PLAN_KEY, (doc) => {
      doc.praevention = doc.praevention || {};
      doc.praevention[body.id] = anzahl;
      return { ok: true };
    }, ladePlan);
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === "plan_dazu" || body.action === "plan_weg") {
    const kurs = [...STUNDEN, ...INFO_KURSE].find((x) => x.id === body.id);
    const d = String(body.datum || "");
    if (!kurs || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ fehler: "Bitte Kurs und Datum angeben." }, 400);
    if (body.action === "plan_weg" && STUNDEN.includes(kurs)) {
      const { doc } = await lade(st, `s/${d}_${kurs.id}`);
      if (doc.eintraege.length) return json({ fehler: "F\xFCr diesen Termin sind schon Leute eingetragen. Markier die Stunde in der Anmeldeliste als ausgefallen, dann sehen alle, dass sie nicht stattfindet." }, 409);
    }
    const grenze = plusTage(jetztBerlin().datum, -30);
    const r = await aendern(st, PLAN_KEY, (doc) => {
      const l = new Set(doc.termine[kurs.id] || []);
      if (body.action === "plan_dazu") l.add(d);
      else l.delete(d);
      doc.termine[kurs.id] = [...l].filter((x) => x >= grenze).sort();
      return { ok: true };
    }, ladePlan);
    return json(r, r.fehler ? 409 : 200);
  }
  const key = String(body.key || "");
  if (!/^s\/\d{4}-\d{2}-\d{2}_[a-z0-9]+$/.test(key)) return json({ fehler: "Unbekannte Stunde." }, 400);
  if (body.action === "eintragen") {
    const t = terminAusKey(key);
    if (!t || t.datum < plusTage(jetztBerlin().datum, -14)) return json({ fehler: "Diese Stunde kann nicht mehr ge\xE4ndert werden." }, 400);
    let name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 60);
    let art = String(body.art || "");
    let karte = null;
    if (art === "Karte" || art === "KarteHansefit") {
      karte = (await ladeKarten(st)).doc.karten.find((x) => x.id === body.kartenId);
      if (!karte) return json({ fehler: "Bitte eine Karte ausw\xE4hlen." }, 400);
      name = name || karte.name;
      art = `${karte.typ}-Karte` + (art === "KarteHansefit" ? " + Hansefit/epassi" : "");
    } else if (!ARTEN_ADMIN.includes(art)) return json({ fehler: "Bitte die Teilnahmeart w\xE4hlen." }, 400);
    if (name.length < 2) return json({ fehler: "Bitte einen Namen eintragen." }, 400);
    const r = await aendern(st, key, (doc) => {
      if (karte && doc.eintraege.some((e) => e.kartenId === karte.id)) return { fehler: "Diese Karte ist f\xFCr die Stunde schon eingetragen." };
      doc.eintraege.push({ id: zufall(8), name, art, ts: (/* @__PURE__ */ new Date()).toISOString(), tokenHash: "", vonBettina: true, ...karte ? { kartenId: karte.id } : {} });
      return { ok: true };
    });
    if (r.fehler) return json(r, 409);
    await abrechnen(st).catch(() => {
    });
    return json(r);
  }
  if (body.action === "ausfall") {
    const r = await aendern(st, key, (doc) => {
      doc.ausfall = !!body.wert;
      if (doc.ausfall) doc.bestaetigt = false;
      return { ok: true };
    });
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === "bestaetigen") {
    const r = await aendern(st, key, (doc) => {
      doc.bestaetigt = !!body.wert;
      if (doc.bestaetigt) doc.ausfall = false;
      return { ok: true };
    });
    return json(r, r.fehler ? 409 : 200);
  }
  if (body.action === "bezahlt") {
    const r = await aendern(st, key, (doc) => {
      const e = doc.eintraege.find((x) => x.id === body.id);
      if (!e) return { fehler: "Eintrag nicht gefunden." };
      e.bezahlt = !!body.wert;
      return { ok: true };
    });
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === "erlassen") {
    const r = await aendern(st, key, (doc) => {
      const e = doc.spaet.find((x) => x.id === body.id);
      if (!e) return { fehler: "Eintrag nicht gefunden." };
      e.erlassen = !!body.wert;
      return { ok: true };
    });
    return json(r, r.fehler ? 404 : 200);
  }
  if (body.action === "entfernen") {
    const r = await aendern(st, key, (doc) => {
      const i = doc.eintraege.findIndex((e) => e.id === body.id);
      if (i < 0) return { fehler: "Eintrag nicht gefunden." };
      doc.eintraege.splice(i, 1);
      return { ok: true };
    });
    return json(r, r.fehler ? 404 : 200);
  }
  return json({ fehler: "Unbekannte Aktion." }, 400);
};
var config = { path: "/api/anmeldung" };
export {
  config,
  anmeldung_default as default
};
