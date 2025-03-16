/**
 * URL 解析工具库
 * 
 * 这个文件提供了一系列用于解析和处理 URL 各个组成部分的工具函数。
 * 
 * URL 的基本组成：
 * protocol://username:password@host:port/path?query#fragment
 * 
 * 例如：https://user:pass@example.com:8080/path/to/page?key=value#section
 * - protocol: https:
 * - username: user
 * - password: pass
 * - host: example.com:8080
 * - pathname: /path/to/page
 * - search: ?key=value
 * - hash: #section
 */

import { decode } from "./encoding";
import { hasProtocol } from "./utils";

// 特殊符号，用于标记URL是否使用相对协议（如 //example.com）
const protocolRelative = Symbol.for("ufo:protocolRelative");

/**
 * 解析后的 URL 结构
 * 包含 URL 的所有重要组成部分
 */
export interface ParsedURL {
  protocol?: string;      // 协议（如 http:, https:）
  host?: string;         // 主机名和端口
  auth?: string;         // 认证信息（用户名:密码）
  href?: string;         // 完整的URL字符串
  pathname: string;      // 路径部分
  hash: string;          // 哈希部分（#后面的内容）
  search: string;        // 查询字符串（?后面的内容）
  [protocolRelative]?: boolean;  // 是否使用相对协议
}

/**
 * URL 认证信息结构
 */
export interface ParsedAuth {
  username: string;      // 用户名
  password: string;      // 密码
}

/**
 * 主机信息结构
 */
export interface ParsedHost {
  hostname: string;      // 主机名
  port: string;         // 端口号
}

/**
 * 解析 URL 字符串
 * 将 URL 字符串解析为结构化的对象形式
 * 
 * 特点：
 * 1. 支持特殊协议（blob:, data:, javascript:, vbscript:）
 * 2. 支持相对协议（//example.com）
 * 3. 支持默认协议（当URL没有协议时）
 * 
 * 使用示例：
 * 1. 完整URL解析：
 *    parseURL("http://example.com/path?q=1#hash")
 *    => {
 *      protocol: "http:",
 *      host: "example.com",
 *      pathname: "/path",
 *      search: "?q=1",
 *      hash: "#hash"
 *    }
 * 
 * 2. 相对路径解析：
 *    parseURL("/path/to/file")
 *    => {
 *      pathname: "/path/to/file",
 *      search: "",
 *      hash: ""
 *    }
 * 
 * 3. 使用默认协议：
 *    parseURL("example.com", "https://")
 *    => {
 *      protocol: "https:",
 *      host: "example.com",
 *      ...
 *    }
 */
export function parseURL(input = "", defaultProto?: string): ParsedURL {
  // 处理特殊协议（blob:, data:, javascript:, vbscript:）
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i,
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: "",
    };
  }

  // 如果没有协议，尝试使用默认协议或解析为路径
  if (!hasProtocol(input, { acceptRelative: true })) {
    return defaultProto ? parseURL(defaultProto + input) : parsePath(input);
  }

  // 解析标准URL格式
  // 1. 替换反斜杠为正斜杠
  // 2. 提取协议、认证信息和剩余部分
  const [, protocol = "", auth, hostAndPath = ""] =
    input
      .replace(/\\/g, "/")
      .match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];

  // 分离主机名和路径
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];

  // 特殊处理 file: 协议
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }

  // 解析路径、查询字符串和哈希
  const { pathname, search, hash } = parsePath(path);

  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol,
  };
}

/**
 * 解析 URL 路径部分
 * 将路径字符串拆分为路径、查询参数和哈希三部分
 * 
 * 示例：
 * parsePath("/path/to/file?key=value#section")
 * => {
 *      pathname: "/path/to/file",
 *      search: "?key=value",
 *      hash: "#section"
 *    }
 */
export function parsePath(input = ""): ParsedURL {
  const [pathname = "", search = "", hash = ""] = (
    input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []
  ).splice(1);
  return {
    pathname,
    search,
    hash,
  };
}

/**
 * 解析认证信息
 * 将 "username:password" 格式的字符串解析为对象
 * 
 * 特点：
 * 1. 自动解码 URL 编码的用户名和密码
 * 2. 如果没有密码部分，返回空字符串
 * 
 * 示例：
 * parseAuth("user:pass") => { username: "user", password: "pass" }
 * parseAuth("admin") => { username: "admin", password: "" }
 */
export function parseAuth(input = ""): ParsedAuth {
  const [username, password] = input.split(":");
  return {
    username: decode(username),
    password: decode(password),
  };
}

/**
 * 解析主机信息
 * 将 "hostname:port" 格式的字符串解析为对象
 * 
 * 特点：
 * 1. 自动解码主机名
 * 2. 提取端口号（如果有）
 * 3. 端口号必须是数字
 * 
 * 示例：
 * parseHost("example.com:8080") => { hostname: "example.com", port: "8080" }
 * parseHost("localhost") => { hostname: "localhost", port: undefined }
 */
export function parseHost(input = ""): ParsedHost {
  const [hostname, port] = (input.match(/([^/:]*):?(\d+)?/) || []).splice(1);
  return {
    hostname: decode(hostname),
    port,
  };
}

/**
 * 将解析后的 URL 对象转换回字符串
 * 
 * 特点：
 * 1. 智能处理可选部分（协议、认证信息等）
 * 2. 正确处理查询字符串的问号
 * 3. 支持相对协议URLs
 * 
 * 示例：
 * stringifyParsedURL({
 *   protocol: "https:",
 *   auth: "user:pass",
 *   host: "example.com",
 *   pathname: "/path",
 *   search: "key=value",
 *   hash: "#section"
 * })
 * => "https://user:pass@example.com/path?key=value#section"
 */
export function stringifyParsedURL(parsed: Partial<ParsedURL>): string {
  const pathname = parsed.pathname || "";
  const search = parsed.search
    ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search
    : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto =
    parsed.protocol || parsed[protocolRelative]
      ? (parsed.protocol || "") + "//"
      : "";
  return proto + auth + host + pathname + search + hash;
}

// 文件名提取的正则表达式
const FILENAME_STRICT_REGEX = /\/([^/]+\.[^/]+)$/;  // 严格模式：必须包含扩展名
const FILENAME_REGEX = /\/([^/]+)$/;                // 宽松模式：最后一个路径段

/**
 * 从 URL 中提取文件名
 * 
 * 特点：
 * 1. 支持严格模式和宽松模式
 * 2. 严格模式要求文件必须有扩展名
 * 3. 只关注路径的最后一个部分
 * 
 * 参数：
 * - input: URL 或路径字符串
 * - strict: 是否使用严格模式（必须包含扩展名）
 * 
 * 示例：
 * 1. 标准文件：
 *    parseFilename("/path/to/file.txt") => "file.txt"
 * 
 * 2. 严格模式下的隐藏文件：
 *    parseFilename("/path/.htaccess", { strict: true }) => undefined
 * 
 * 3. 普通模式下的任意文件：
 *    parseFilename("/path/readme") => "readme"
 */
export function parseFilename(input = "", { strict }): string | undefined {
  const { pathname } = parseURL(input);
  const matches = strict
    ? pathname.match(FILENAME_STRICT_REGEX)
    : pathname.match(FILENAME_REGEX);
  return matches ? matches[1] : undefined;
}
