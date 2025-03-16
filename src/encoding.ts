/**
 * URL 编码工具库
 * 
 * 这个文件提供了一系列用于处理 URL 编码的工具函数。主要功能包括：
 * 1. URL 各个部分（路径、查询参数、哈希）的编码和解码
 * 2. 特殊字符的安全转换（如空格、斜杠、&符号等）
 * 3. 国际化域名（使用 Punycode）的编码
 * 
 * 编码的主要目的是确保 URL 中的特殊字符能被正确处理，比如：
 * - 中文字符："春节" => "%E6%98%A5%E8%8A%82"
 * - 空格：" " => "+" 或 "%20"（取决于是否在查询字符串中）
 * - 特殊符号："/", "?", "#" 等都需要编码
 * 
 * 代码部分来源于 vue-router-next 项目（作者 @posva）
 */

import { toASCII } from "./punycode";
import { QueryValue } from "./query";

// === URL 特殊字符的正则表达式定义 ===
// 这些正则用于匹配需要编码的特殊字符，以及已编码字符的还原

// 基础字符的正则表达式
const HASH_RE = /#/g;           // '#' 需要编码为 %23
const AMPERSAND_RE = /&/g;      // '&' 需要编码为 %26
const SLASH_RE = /\//g;         // '/' 需要编码为 %2F
const EQUAL_RE = /=/g;          // '=' 需要编码为 %3D
const IM_RE = /\?/g;           // '?' 需要编码为 %3F
const PLUS_RE = /\+/g;         // '+' 需要编码为 %2B

// 已编码字符的正则表达式（用于解码）
const ENC_CARET_RE = /%5e/gi;         // %5E => '^'
const ENC_BACKTICK_RE = /%60/gi;      // %60 => '`'
const ENC_CURLY_OPEN_RE = /%7b/gi;    // %7B => '{'
const ENC_PIPE_RE = /%7c/gi;          // %7C => '|'
const ENC_CURLY_CLOSE_RE = /%7d/gi;   // %7D => '}'
const ENC_SPACE_RE = /%20/gi;         // %20 => ' '
const ENC_SLASH_RE = /%2f/gi;         // %2F => '/'
const ENC_ENC_SLASH_RE = /%252f/gi;   // %252F => '%2F'

/**
 * 基础 URL 编码函数
 * 将文本转换为 URL 安全的格式，主要用于 URL 的路径、查询参数和哈希部分
 * 
 * 特点：
 * 1. 使用 encodeURI 进行基础编码
 * 2. 保留某些特殊字符（如'|'）的原始形式
 * 
 * 使用场景：
 * - 对 URL 路径中的中文进行编码
 * - 处理文件名包含特殊字符的情况
 * 
 * 示例：
 * encode("你好世界") => "%E4%BD%A0%E5%A5%BD%E4%B8%96%E7%95%8C"
 * encode("hello world") => "hello%20world"
 */
export function encode(text: string | number): string {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}

/**
 * URL 哈希部分编码
 * 专门用于处理 URL 中 # 后面的部分
 * 
 * 特点：
 * 1. 基于 encode 函数
 * 2. 保留更多特殊字符（如 {、}、^）
 * 
 * 示例：
 * encodeHash("section{1}") => "section{1}"
 * encodeHash("标题#1") => "%E6%A0%87%E9%A2%98#1"
 */
export function encodeHash(text: string): string {
  return encode(text)
    .replace(ENC_CURLY_OPEN_RE, "{")
    .replace(ENC_CURLY_CLOSE_RE, "}")
    .replace(ENC_CARET_RE, "^");
}

/**
 * 查询参数值编码
 * 专门用于编码 URL 查询字符串中的值部分
 * 
 * 特点：
 * 1. 支持字符串和其他类型（自动转 JSON）
 * 2. 特殊处理空格（转换为+）
 * 3. 确保某些字符（如 &、#）被正确编码
 * 
 * 示例：
 * encodeQueryValue("a b") => "a+b"
 * encodeQueryValue({ x: 1 }) => "%7B%22x%22%3A1%7D"
 * encodeQueryValue("50%") => "50%25"
 */
export function encodeQueryValue(input: QueryValue): string {
  return (
    encode(typeof input === "string" ? input : JSON.stringify(input))
      .replace(PLUS_RE, "%2B")      // 先编码+号，防止与空格编码冲突
      .replace(ENC_SPACE_RE, "+")   // 将空格编码为+号（URL 查询参数的标准做法）
      .replace(HASH_RE, "%23")      // 确保 # 被编码
      .replace(AMPERSAND_RE, "%26") // 确保 & 被编码
      .replace(ENC_BACKTICK_RE, "`")
      .replace(ENC_CARET_RE, "^")
      .replace(SLASH_RE, "%2F")
  );
}

/**
 * 查询参数键编码
 * 专门用于编码 URL 查询字符串中的键部分
 * 
 * 特点：
 * 1. 基于 encodeQueryValue
 * 2. 额外编码等号（=）
 * 
 * 示例：
 * encodeQueryKey("key=value") => "key%3Dvalue"
 */
export function encodeQueryKey(text: string | number): string {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}

/**
 * 路径编码
 * 专门用于处理 URL 路径部分的编码
 * 
 * 特点：
 * 1. 保留路径分隔符（/）
 * 2. 编码查询字符串相关字符（?、&）
 * 3. 处理特殊情况（如 %2F 的二次编码）
 * 
 * 使用场景：
 * - 处理文件路径
 * - 处理 API 端点路径
 * 
 * 示例：
 * encodePath("/path/to/文件") => "/path/to/%E6%96%87%E4%BB%B6"
 * encodePath("api?version=1") => "api%3Fversion=1"
 */
export function encodePath(text: string | number): string {
  return encode(text)
    .replace(HASH_RE, "%23")
    .replace(IM_RE, "%3F")
    .replace(ENC_ENC_SLASH_RE, "%2F")
    .replace(AMPERSAND_RE, "%26")
    .replace(PLUS_RE, "%2B");
}

/**
 * 参数编码
 * 用于编码 URL 路径中的参数部分，比如 RESTful API 中的路径参数
 * 
 * 特点：
 * 1. 基于 encodePath
 * 2. 额外编码斜杠（/）
 * 
 * 使用场景：
 * - RESTful API 的路径参数
 * - 需要在路径中编码完整文件路径时
 * 
 * 示例：
 * encodeParam("2023/01") => "2023%2F01"
 * encodeParam("user/profile") => "user%2Fprofile"
 */
export function encodeParam(text: string | number): string {
  return encodePath(text).replace(SLASH_RE, "%2F");
}

/**
 * URL 解码函数
 * 将编码后的 URL 文本还原为原始形式
 * 
 * 特点：
 * 1. 使用 decodeURIComponent 进行解码
 * 2. 容错处理：解码失败时返回原文本
 * 
 * 示例：
 * decode("%E4%BD%A0%E5%A5%BD") => "你好"
 * decode("invalid%") => "invalid%"（解码失败，返回原文本）
 */
export function decode(text: string | number = ""): string {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}

/**
 * 路径解码
 * 专门用于解码 URL 路径部分
 * 
 * 特点：
 * 1. 处理特殊的斜杠编码（%2F => /）
 * 2. 与 encodePath 函数配对使用
 * 
 * 示例：
 * decodePath("/path%2Fto%2Ffile") => "/path/to/file"
 */
export function decodePath(text: string): string {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}

/**
 * 查询参数键解码
 * 用于解码 URL 查询参数中的键名
 * 
 * 特点：
 * 1. 将+号转换回空格
 * 2. 与 encodeQueryKey 函数配对使用
 * 
 * 示例：
 * decodeQueryKey("first+name") => "first name"
 */
export function decodeQueryKey(text: string): string {
  return decode(text.replace(PLUS_RE, " "));
}

/**
 * 查询参数值解码
 * 用于解码 URL 查询参数中的值
 * 
 * 特点：
 * 1. 将+号转换回空格
 * 2. 与 encodeQueryValue 函数配对使用
 * 
 * 示例：
 * decodeQueryValue("hello+world") => "hello world"
 */
export function decodeQueryValue(text: string): string {
  return decode(text.replace(PLUS_RE, " "));
}

/**
 * 域名编码
 * 使用 Punycode 编码处理国际化域名（IDN）
 * 
 * 作用：
 * 将包含非 ASCII 字符的域名转换为 ASCII 形式
 * 
 * 使用场景：
 * - 处理中文域名
 * - 处理其他语言的域名
 * 
 * 示例：
 * encodeHost("例子.测试") => "xn--fsq.xn--0zwm56d"
 */
export function encodeHost(name = "") {
  return toASCII(name);
}
