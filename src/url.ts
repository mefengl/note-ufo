/**
 * URL 类实现
 * 
 * 这个文件提供了一个类似于浏览器原生 URL API 的实现。
 * 虽然已经被标记为废弃（推荐使用原生 URL 或 parseURL），
 * 但它的实现展示了如何构建一个完整的 URL 处理类。
 * 
 * 功能特点：
 * 1. 完整的 URL 解析和构建
 * 2. 支持查询字符串的对象操作
 * 3. 自动编码和解码
 * 4. URL 组件的独立访问和修改
 */

import { parseURL, parseAuth, parseHost } from "./parse";
import { QueryObject, parseQuery, stringifyQuery } from "./query";
import { withoutLeadingSlash, withTrailingSlash } from "./utils";
import {
  encodeHash,
  encodePath,
  decodePath,
  decode,
  encodeHost,
} from "./encoding";

/**
 * URL 类
 * 提供类似浏览器原生 URL API 的功能
 * 
 * 已废弃说明：推荐使用：
 * 1. new URL(input) - 浏览器原生 API
 * 2. ufo.parseURL(input) - 本库提供的函数式 API
 * 
 * URL 示例：
 * https://user:pass@example.com:8080/path?query=1#hash
 * 
 * 使用示例：
 * const url = new $URL('https://example.com/api')
 * url.query.token = 'abc'
 * url.pathname = '/v2/users'
 * console.log(url.href) // 'https://example.com/v2/users?token=abc'
 */
export class $URL implements URL {
  protocol: string;    // 协议，如 "https:"
  host: string;        // 主机名和端口，如 "example.com:8080"
  auth: string;        // 认证信息，如 "user:pass"
  pathname: string;    // 路径名，如 "/path"
  query: QueryObject = {};  // 查询参数对象
  hash: string;        // 哈希值，如 "#hash"

  /**
   * 构造函数
   * 将 URL 字符串解析为结构化的 URL 对象
   * 
   * @param input - URL 字符串，默认为空字符串
   * @throws {TypeError} 当输入不是字符串时抛出
   * 
   * 示例：
   * new $URL('https://example.com/path?q=1#hash')
   */
  constructor(input = "") {
    if (typeof input !== "string") {
      throw new TypeError(
        `URL input should be string received ${typeof input} (${input})`,
      );
    }
    const parsed = parseURL(input);
    this.protocol = decode(parsed.protocol);
    this.host = decode(parsed.host);
    this.auth = decode(parsed.auth);
    this.pathname = decodePath(parsed.pathname);
    this.query = parseQuery(parsed.search);
    this.hash = decode(parsed.hash);
  }

  /**
   * 获取主机名（不含端口）
   * @returns {string} 主机名部分
   * 
   * 示例：
   * url = new $URL('http://example.com:8080')
   * url.hostname // 'example.com'
   */
  get hostname(): string {
    return parseHost(this.host).hostname;
  }

  /**
   * 获取端口号
   * @returns {string} 端口号，如果未指定则返回空字符串
   * 
   * 示例：
   * url = new $URL('http://example.com:8080')
   * url.port // '8080'
   */
  get port(): string {
    return parseHost(this.host).port || "";
  }

  /**
   * 获取用户名
   * @returns {string} URL中的用户名部分
   * 
   * 示例：
   * url = new $URL('http://user:pass@example.com')
   * url.username // 'user'
   */
  get username(): string {
    return parseAuth(this.auth).username;
  }

  /**
   * 获取密码
   * @returns {string} URL中的密码部分，如果没有则返回空字符串
   * 
   * 示例：
   * url = new $URL('http://user:pass@example.com')
   * url.password // 'pass'
   */
  get password(): string {
    return parseAuth(this.auth).password || "";
  }

  /**
   * 检查是否包含协议
   * @returns {boolean} 是否指定了协议
   * 
   * 示例：
   * new $URL('http://example.com').hasProtocol // true
   * new $URL('//example.com').hasProtocol // false
   */
  get hasProtocol() {
    return this.protocol.length;
  }

  /**
   * 检查是否是绝对路径
   * 当 URL 包含协议或以斜杠开头时返回 true
   * 
   * 示例：
   * new $URL('http://example.com').isAbsolute // true
   * new $URL('/path').isAbsolute // true
   * new $URL('path').isAbsolute // false
   */
  get isAbsolute() {
    return this.hasProtocol || this.pathname[0] === "/";
  }

  /**
   * 获取编码后的查询字符串
   * @returns {string} 以问号开头的查询字符串
   * 
   * 示例：
   * url = new $URL('http://example.com')
   * url.query = { name: '张三', age: 25 }
   * url.search // '?name=张三&age=25'
   */
  get search(): string {
    const q = stringifyQuery(this.query);
    return q.length > 0 ? "?" + q : "";
  }

  /**
   * 获取 URLSearchParams 对象
   * 提供标准的查询字符串处理接口
   * 
   * 特点：
   * 1. 自动处理数组值
   * 2. 自动序列化对象值
   * 3. 符合 Web 标准接口
   * 
   * 示例：
   * url = new $URL('http://example.com?tags=js&tags=ts')
   * url.searchParams.getAll('tags') // ['js', 'ts']
   */
  get searchParams(): URLSearchParams {
    const p = new URLSearchParams();
    for (const name in this.query) {
      const value = this.query[name];
      if (Array.isArray(value)) {
        for (const v of value) {
          p.append(name, v);
        }
      } else {
        p.append(
          name,
          typeof value === "string" ? value : JSON.stringify(value),
        );
      }
    }
    return p;
  }

  /**
   * 获取 URL 的源（origin）
   * 包含协议、主机名和端口（如果有）
   * 
   * 示例：
   * url = new $URL('https://example.com:8080/path')
   * url.origin // 'https://example.com:8080'
   */
  get origin(): string {
    return (this.protocol ? this.protocol + "//" : "") + encodeHost(this.host);
  }

  /**
   * 获取完整路径
   * 包含编码后的路径名、查询字符串和哈希
   * 
   * 示例：
   * url = new $URL('http://example.com/path?q=1#hash')
   * url.fullpath // '/path?q=1#hash'
   */
  get fullpath(): string {
    return encodePath(this.pathname) + this.search + encodeHash(this.hash);
  }

  /**
   * 获取编码后的认证信息
   * 用于在 URL 中安全地使用用户名和密码
   * 
   * 示例：
   * url = new $URL('http://用户:密码@example.com')
   * url.encodedAuth // '%E7%94%A8%E6%88%B7:%E5%AF%86%E7%A0%81'
   */
  get encodedAuth(): string {
    if (!this.auth) {
      return "";
    }
    const { username, password } = parseAuth(this.auth);
    return (
      encodeURIComponent(username) +
      (password ? ":" + encodeURIComponent(password) : "")
    );
  }

  /**
   * 获取完整的 URL 字符串
   * 所有组件都经过适当的编码
   * 
   * 特点：
   * 1. 智能处理认证信息
   * 2. 根据 URL 类型（绝对/相对）选择适当的格式
   * 3. 自动编码所有组件
   * 
   * 示例：
   * url = new $URL('https://用户:密码@测试.com/路径?参数=值#标记')
   * url.href // 'https://%E7%94%A8%E6%88%B7:%E5%AF%86%E7%A0%81@xn--fiq228c.com/%E8%B7%AF%E5%BE%84?%E5%8F%82%E6%95%B0=%E5%80%BC#%E6%A0%87%E8%AE%B0'
   */
  get href(): string {
    const auth = this.encodedAuth;
    const originWithAuth =
      (this.protocol ? this.protocol + "//" : "") +
      (auth ? auth + "@" : "") +
      encodeHost(this.host);
    return this.hasProtocol && this.isAbsolute
      ? originWithAuth + this.fullpath
      : this.fullpath;
  }

  /**
   * 追加另一个 URL 的内容
   * 合并路径、查询参数和哈希
   * 
   * 特点：
   * 1. 不允许追加带协议的 URL
   * 2. 智能合并查询参数
   * 3. 正确处理路径拼接
   * 
   * @param {$URL} url - 要追加的 URL 对象
   * @throws {Error} 如果要追加的 URL 带有协议则抛出错误
   * 
   * 示例：
   * const base = new $URL('https://example.com/api')
   * const path = new $URL('/users?sort=desc')
   * base.append(path)
   * base.href // 'https://example.com/api/users?sort=desc'
   */
  append(url: $URL) {
    if (url.hasProtocol) {
      throw new Error("Cannot append a URL with protocol");
    }
    Object.assign(this.query, url.query);
    if (url.pathname) {
      this.pathname =
        withTrailingSlash(this.pathname) + withoutLeadingSlash(url.pathname);
    }
    if (url.hash) {
      this.hash = url.hash;
    }
  }

  /**
   * 将 URL 对象转换为 JSON
   * 在 JSON.stringify() 时调用
   */
  toJSON(): string {
    return this.href;
  }

  /**
   * 将 URL 对象转换为字符串
   * 在字符串操作时调用
   */
  toString(): string {
    return this.href;
  }
}

/**
 * 创建 URL 对象的工厂函数
 * 
 * @deprecated 推荐使用 new URL(input) 或 parseURL(input)
 * @param {string} input - URL 字符串
 * @returns {$URL} URL 对象
 * 
 * 示例：
 * const url = createURL('https://example.com')
 */
export function createURL(input: string): $URL {
  return new $URL(input);
}
