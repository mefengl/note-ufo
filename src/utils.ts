/**
 * URL 工具函数库
 * 这个文件包含了处理 URL 的各种基础工具函数。
 * 主要功能包括：
 * 1. URL 的协议（Protocol）处理
 * 2. 斜杠（/）的添加和删除
 * 3. URL 路径的拼接和解析
 * 4. 查询字符串和片段（Fragment）的处理
 * 5. URL 的规范化
 */

import { parseURL, stringifyParsedURL } from "./parse";
import { QueryObject, parseQuery, stringifyQuery, ParsedQuery } from "./query";
import {
  decode,
  decodePath,
  encodeHash,
  encodeHost,
  encodePath,
} from "./encoding";

// 严格的协议正则表达式，要求协议后必须跟着一个或两个斜杠
const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
// 普通的协议正则表达式，协议后的斜杠是可选的
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
// 相对协议正则表达式，匹配以两个或更多斜杠开头的URL（如 //example.com）
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
// 危险协议正则表达式，用于识别不安全的URL协议
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
// 匹配URL末尾的斜杠、问号或井号
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
// 匹配以./或/开头的路径
const JOIN_LEADING_SLASH_RE = /^\.?\//;

/**
 * 检查路径是否是相对路径
 * 相对路径以 './' 或 '../' 开头
 * 
 * 举例：
 * - './images/logo.png' => true
 * - '../styles/main.css' => true
 * - '/absolute/path' => false
 * 
 * 小知识：在文件系统中，
 * - './' 表示当前目录
 * - '../' 表示上一级目录
 */
export function isRelative(inputString: string) {
  return ["./", "../"].some((string_) => inputString.startsWith(string_));
}

export interface HasProtocolOptions {
  acceptRelative?: boolean;
  strict?: boolean;
}

/**
 * Checks if the input has a protocol.
 *
 * You can use `{ acceptRelative: true }` to accept relative URLs as valid protocol.
 *
 * @group utils
 */
export function hasProtocol(
  inputString: string,
  opts?: HasProtocolOptions,
): boolean;
/** @deprecated Same as { hasProtocol(inputString, { acceptRelative: true }) */
export function hasProtocol(
  inputString: string,
  acceptRelative: boolean,
): boolean;
export function hasProtocol(
  inputString: string,
  opts: boolean | HasProtocolOptions = {},
): boolean {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return (
    PROTOCOL_REGEX.test(inputString) ||
    (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false)
  );
}

/**
 * Checks if the input protocol is any of the dangerous `blob:`, `data:`, `javascript`: or `vbscript:` protocols.
 *
 * @group utils
 */
export function isScriptProtocol(protocol?: string) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}

/**
 * Checks if the input has a trailing slash.
 *
 * @group utils
 */
export function hasTrailingSlash(
  input = "",
  respectQueryAndFragment?: boolean,
): boolean {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}

/**
 * Removes the trailing slash from the URL or pathname.
 *
 * If second argument is `true`, it will only remove the trailing slash if it's not part of the query or fragment with cost of more expensive operations.
 *
 * @example
 *
 * ```js
 * withoutTrailingSlash("/foo/"); // "/foo"
 *
 * withoutTrailingSlash("/path/?query=true", true); // "/path?query=true"
 * ```
 *
 * @group utils
 */
export function withoutTrailingSlash(
  input = "",
  respectQueryAndFragment?: boolean,
): string {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (
    (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment
  );
}

/**
 * Ensures the URL ends with a trailing slash.
 *
 * If second argument is `true`, it will only add the trailing slash if it's not part of the query or fragment with cost of more expensive operation.
 *
 * @example
 *
 * ```js
 * withTrailingSlash("/foo"); // "/foo/"
 *
 * withTrailingSlash("/path?query=true", true); // "/path/?query=true"
 * ```
 *
 * @group utils
 */
export function withTrailingSlash(
  input = "",
  respectQueryAndFragment?: boolean,
): string {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex >= 0) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}

/**
 * Checks if the input has a leading slash (e.g. `/foo`).
 *
 * @group utils
 */
export function hasLeadingSlash(input = ""): boolean {
  return input.startsWith("/");
}

/**
 * Removes leading slash from the URL or pathname.
 *
 * @group utils
 */
export function withoutLeadingSlash(input = ""): string {
  return (hasLeadingSlash(input) ? input.slice(1) : input) || "/";
}

/**
 * Ensures the URL or pathname has a leading slash.
 *
 * @group utils
 */
export function withLeadingSlash(input = ""): string {
  return hasLeadingSlash(input) ? input : "/" + input;
}

/**
 * Removes double slashes from the URL.
 *
 * @example
 *
 * ```js
 * cleanDoubleSlashes("//foo//bar//"); // "/foo/bar/"
 *
 * cleanDoubleSlashes("http://example.com/analyze//http://localhost:3000//");
 * // Returns "http://example.com/analyze/http://localhost:3000/"
 * ```
 *
 * @group utils
 */
export function cleanDoubleSlashes(input = ""): string {
  return input
    .split("://")
    .map((string_) => string_.replace(/\/{2,}/g, "/"))
    .join("://");
}

/**
 * Ensures the URL or pathname starts with base.
 *
 * If input aleady starts with base, it will not be added again.
 *
 * @group utils
 */
export function withBase(input: string, base: string) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}

/**
 * Removes the base from the URL or pathname.
 *
 * If input does not start with base, it will not be removed.
 *
 * @group utils
 */
export function withoutBase(input: string, base: string) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}

/**
 * Add/Replace the query section of the URL.
 *
 * @example
 *
 * ```js
 * withQuery("/foo?page=a", { token: "secret" }); // "/foo?page=a&token=secret"
 * ```
 *
 * @group utils
 */
export function withQuery(input: string, query: QueryObject): string {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}

/**
 * Parses and decodes the query object of an input URL into an object.
 *
 * @example
 *
 * ```js
 * getQuery("http://foo.com/foo?test=123&unicode=%E5%A5%BD");
 * // { test: "123", unicode: "好" }
 * ```
 * @group utils
 */
export function getQuery<T extends ParsedQuery = ParsedQuery>(
  input: string,
): T {
  return parseQuery<T>(parseURL(input).search);
}

/**
 * Checks if the input URL is empty or `/`.
 *
 * @group utils
 */
export function isEmptyURL(url: string) {
  return !url || url === "/";
}

/**
 * Checks if the input URL is neither empty nor `/`.
 *
 * @group utils
 */
export function isNonEmptyURL(url: string) {
  return url && url !== "/";
}

/**
 * Joins multiple URL segments into a single URL.
 *
 * @example
 *
 * ```js
 * joinURL("a", "/b", "/c"); // "a/b/c"
 * ```
 *
 * @group utils
 */
export function joinURL(base: string, ...input: string[]): string {
  let url = base || "";

  for (const segment of input.filter((url) => isNonEmptyURL(url))) {
    if (url) {
      // TODO: Handle .. when joining
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }

  return url;
}

/**
 * Joins multiple URL segments into a single URL and also handles relative paths with `./` and `../`.
 *
 * @example
 *
 * ```js
 * joinRelativeURL("/a", "../b", "./c"); // "/b/c"
 * ```
 *
 * @group utils
 */
export function joinRelativeURL(..._input: string[]): string {
  // Inlined regex to increase browser compatibiltiy
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;

  const input = _input.filter(Boolean);

  const segments: string[] = [];

  let segmentsDepth = 0;

  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      // eslint-disable-next-line unicorn/prefer-at
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }

  let url = segments.join("/");

  if (segmentsDepth >= 0) {
    // Preserve leading slash
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    // Add relative prefix
    url = "../".repeat(-1 * segmentsDepth) + url;
  }

  // Preserve trailing slash
  // eslint-disable-next-line unicorn/prefer-at
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }

  return url;
}

/**
 * Adds or replaces the URL protocol to `http://`.
 *
 * @example
 *
 * ```js
 * withHttp("https://example.com"); // http://example.com
 * ```
 *
 * @group utils
 */
export function withHttp(input: string): string {
  return withProtocol(input, "http://");
}

/**
 * Adds or replaces the URL protocol to `https://`.
 *
 * @example
 *
 * ```js
 * withHttps("http://example.com"); // https://example.com
 * ```
 *
 * @group utils
 */
export function withHttps(input: string): string {
  return withProtocol(input, "https://");
}

/**
 * Removes the protocol from the input.
 *
 * @example
 * ```js
 * withoutProtocol("http://example.com"); // "example.com"
 * ```
 */
export function withoutProtocol(input: string): string {
  return withProtocol(input, "");
}

/**
 * Adds or replaces protocol of the input URL.
 *
 * @example
 * ```js
 * withProtocol("http://example.com", "ftp://"); // "ftp://example.com"
 * ```
 *
 * @group utils
 */
export function withProtocol(input: string, protocol: string): string {
  let match = input.match(PROTOCOL_REGEX);
  if (!match) {
    match = input.match(/^\/{2,}/);
  }
  if (!match) {
    return protocol + input;
  }
  return protocol + input.slice(match[0].length);
}

/**
 * 规范化URL
 * 这个函数会对URL进行全面的清理和标准化处理：
 * 
 * 1. 路径编码：把特殊字符（如空格、中文）转换为URL安全的格式
 *    例如：'我的文件.txt' => '%E6%88%91%E7%9A%84%E6%96%87%E4%BB%B6.txt'
 * 
 * 2. 确保路径以斜杠开头
 *    例如：'api/users' => '/api/users'
 * 
 * 3. 保留协议和主机名（如果有的话）
 *    例如：'http://example.com' 会保持不变
 * 
 * 4. 查询字符串的标准化
 *    例如：'?a=1&a=2' => '?a=1&a=2'（保持顺序和编码）
 * 
 * 5. 对hash部分进行编码
 *    例如：'#部分' => '#%E9%83%A8%E5%88%86'
 * 
 * 使用场景：
 * 1. 发送API请求前规范化URL
 * 2. 存储URL到数据库前进行标准化
 * 3. 比较两个URL是否相同时先进行标准化
 */
export function normalizeURL(input: string): string {
  const parsed = parseURL(input);
  parsed.pathname = encodePath(decodePath(parsed.pathname));
  parsed.hash = encodeHash(decode(parsed.hash));
  parsed.host = encodeHost(decode(parsed.host));
  parsed.search = stringifyQuery(parseQuery(parsed.search));
  return stringifyParsedURL(parsed);
}

/**
 * Resolves multiple URL segments into a single URL.
 *
 * @example
 *
 * ```js
 * resolveURL("http://foo.com/foo?test=123#token", "bar", "baz");
 * // Returns "http://foo.com/foo/bar/baz?test=123#token"
 * ```
 *
 * @group utils
 */
export function resolveURL(base = "", ...inputs: string[]): string {
  if (typeof base !== "string") {
    throw new TypeError(
      `URL input should be string received ${typeof base} (${base})`,
    );
  }

  const filteredInputs = inputs.filter((input) => isNonEmptyURL(input));

  if (filteredInputs.length === 0) {
    return base;
  }

  const url = parseURL(base);

  for (const inputSegment of filteredInputs) {
    const urlSegment = parseURL(inputSegment);

    // Append path
    if (urlSegment.pathname) {
      url.pathname =
        withTrailingSlash(url.pathname) +
        withoutLeadingSlash(urlSegment.pathname);
    }

    // Override hash
    if (urlSegment.hash && urlSegment.hash !== "#") {
      url.hash = urlSegment.hash;
    }

    // Append search
    if (urlSegment.search && urlSegment.search !== "?") {
      if (url.search && url.search !== "?") {
        const queryString = stringifyQuery({
          ...parseQuery(url.search),
          ...parseQuery(urlSegment.search),
        });
        url.search = queryString.length > 0 ? "?" + queryString : "";
      } else {
        url.search = urlSegment.search;
      }
    }
  }

  return stringifyParsedURL(url);
}

/**
 * Check if two paths are equal or not. Trailing slash and encoding are normalized before comparison.
 *
 * @example
 * ```js
 * isSamePath("/foo", "/foo/"); // true
 * ```
 *
 * @group utils
 */
export function isSamePath(p1: string, p2: string) {
  return decode(withoutTrailingSlash(p1)) === decode(withoutTrailingSlash(p2));
}

interface CompareURLOptions {
  trailingSlash?: boolean;
  leadingSlash?: boolean;
  encoding?: boolean;
}

/**
 *  Checks if two paths are equal regardless of encoding, trailing slash, and leading slash differences.
 *
 * You can make slash check strict by setting `{ trailingSlash: true, leadingSlash: true }` as options.
 *
 * You can make encoding check strict by setting `{ encoding: true }` as options.
 *
 * @example
 *
 * ```js
 * isEqual("/foo", "foo"); // true
 * isEqual("foo/", "foo"); // true
 * isEqual("/foo bar", "/foo%20bar"); // true
 *
 * // Strict compare
 * isEqual("/foo", "foo", { leadingSlash: true }); // false
 * isEqual("foo/", "foo", { trailingSlash: true }); // false
 * isEqual("/foo bar", "/foo%20bar", { encoding: true }); // false
 * ```
 *
 * @group utils
 */
export function isEqual(a: string, b: string, options: CompareURLOptions = {}) {
  if (!options.trailingSlash) {
    a = withTrailingSlash(a);
    b = withTrailingSlash(b);
  }
  if (!options.leadingSlash) {
    a = withLeadingSlash(a);
    b = withLeadingSlash(b);
  }
  if (!options.encoding) {
    a = decode(a);
    b = decode(b);
  }
  return a === b;
}

/**
 * Adds or replaces the fragment section of the URL.
 *
 * @example
 *
 * ```js
 * withFragment("/foo", "bar"); // "/foo#bar"
 * withFragment("/foo#bar", "baz"); // "/foo#baz"
 * withFragment("/foo#bar", ""); // "/foo"
 * ```
 *
 * @group utils
 */
export function withFragment(input: string, hash: string): string {
  if (!hash || hash === "#") {
    return input;
  }
  const parsed = parseURL(input);
  parsed.hash = hash === "" ? "" : "#" + encodeHash(hash);
  return stringifyParsedURL(parsed);
}

/**
 * Removes the fragment section from the URL.
 *
 * @example
 *
 * ```js
 * withoutFragment("http://example.com/foo?q=123#bar")
 * // Returns "http://example.com/foo?q=123"
 * ```
 *
 * @group utils
 */
export function withoutFragment(input: string): string {
  return stringifyParsedURL({ ...parseURL(input), hash: "" });
}

/**
 * Removes the host from the URL while preserving everything else.
 *
 * @example
 * ```js
 * withoutHost("http://example.com/foo?q=123#bar")
 * // Returns "/foo?q=123#bar"
 * ```
 *
 * @group utils
 */
export function withoutHost(input: string) {
  const parsed = parseURL(input);
  return (parsed.pathname || "/") + parsed.search + parsed.hash;
}
