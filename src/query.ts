/**
 * URL 查询字符串处理工具
 * 
 * 这个文件提供了处理 URL 查询字符串（Query String）的完整功能：
 * 1. 解析查询字符串为对象
 * 2. 将对象序列化为查询字符串
 * 3. 支持复杂数据类型的编码和解码
 * 
 * 查询字符串示例：
 * "?name=张三&age=25&hobbies=读书&hobbies=写代码"
 * 会被解析为：
 * {
 *   name: "张三",
 *   age: "25",
 *   hobbies: ["读书", "写代码"]
 * }
 */

import {
  decodeQueryKey,
  decodeQueryValue,
  encodeQueryKey,
  encodeQueryValue,
} from "./encoding";

/**
 * 查询参数值的类型定义
 * 支持多种数据类型，使查询字符串更灵活
 */
export type QueryValue =
  | string          // 字符串："name=张三"
  | number          // 数字："age=25"
  | undefined       // 未定义："key"（无值）
  | null           // 空值
  | boolean        // 布尔值："active=true"
  | Array<QueryValue>  // 数组："tags=js&tags=ts"
  | Record<string, any>;  // 对象（会被序列化）

/**
 * 查询参数对象类型
 * 键为字符串，值可以是单个值或值的数组
 * 
 * 示例：
 * {
 *   search: "关键词",
 *   page: 1,
 *   tags: ["js", "ts"]
 * }
 */
export type QueryObject = Record<string, QueryValue | QueryValue[]>;

/**
 * 解析后的查询参数类型
 * 所有值都会被转换为字符串或字符串数组
 * 
 * 示例：
 * {
 *   search: "关键词",
 *   page: "1",
 *   tags: ["js", "ts"]
 * }
 */
export type ParsedQuery = Record<string, string | string[]>;

/**
 * 解析查询字符串
 * 将 URL 的查询字符串部分转换为结构化的对象
 * 
 * 特点：
 * 1. 自动处理前导问号（?）
 * 2. 支持重复键（自动转换为数组）
 * 3. 防止原型污染（忽略 __proto__ 和 constructor）
 * 4. 自动解码 URL 编码的字符
 * 
 * 使用示例：
 * 1. 基本用法：
 *    parseQuery("name=张三&age=25")
 *    => { name: "张三", age: "25" }
 * 
 * 2. 带问号：
 *    parseQuery("?type=user&id=123")
 *    => { type: "user", id: "123" }
 * 
 * 3. 重复参数：
 *    parseQuery("tag=js&tag=ts")
 *    => { tag: ["js", "ts"] }
 * 
 * 4. 空值参数：
 *    parseQuery("empty=&flag")
 *    => { empty: "", flag: "" }
 * 
 * 安全性说明：
 * 为防止原型污染攻击，会忽略 __proto__ 和 constructor 键
 */
export function parseQuery<T extends ParsedQuery = ParsedQuery>(
  parametersString = "",
): T {
  const object: ParsedQuery = {};

  // 移除前导问号
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }

  // 按 & 分割参数对
  for (const parameter of parametersString.split("&")) {
    // 解析键值对，支持无值的参数
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }

    // 解码键名和键值
    const key = decodeQueryKey(s[1]);

    // 防止原型污染
    if (key === "__proto__" || key === "constructor") {
      continue;
    }

    const value = decodeQueryValue(s[2] || "");

    // 处理重复键：转换为数组
    if (object[key] === undefined) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      (object[key] as string[]).push(value);
    } else {
      object[key] = [object[key] as string, value];
    }
  }

  return object as T;
}

/**
 * 编码单个查询参数
 * 将键值对转换为查询字符串格式
 * 
 * 特点：
 * 1. 支持多种数据类型
 * 2. 数组值会展开为多个同名参数
 * 3. null/undefined 值只保留键名
 * 
 * 参数：
 * - key: 参数键名
 * - value: 参数值（支持多种类型）
 * 
 * 使用示例：
 * 1. 基本类型：
 *    encodeQueryItem("name", "张三") => "name=张三"
 * 
 * 2. 数字和布尔值：
 *    encodeQueryItem("age", 25) => "age=25"
 *    encodeQueryItem("active", true) => "active=true"
 * 
 * 3. 数组值：
 *    encodeQueryItem("tags", ["js", "ts"])
 *    => "tags=js&tags=ts"
 * 
 * 4. 空值：
 *    encodeQueryItem("empty", null) => "empty"
 */
export function encodeQueryItem(
  key: string,
  value: QueryValue | QueryValue[],
): string {
  // 处理数字和布尔值
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }

  // 处理空值
  if (!value) {
    return encodeQueryKey(key);
  }

  // 处理数组值
  if (Array.isArray(value)) {
    return value
      .map(
        (_value: QueryValue) =>
          `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`,
      )
      .join("&");
  }

  // 处理普通值
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}

/**
 * 将查询对象序列化为查询字符串
 * 
 * 特点：
 * 1. 过滤掉 undefined 值
 * 2. 自动编码特殊字符
 * 3. 支持嵌套数据结构
 * 
 * 使用示例：
 * 1. 基本对象：
 *    stringifyQuery({ name: "张三", age: 25 })
 *    => "name=张三&age=25"
 * 
 * 2. 带数组：
 *    stringifyQuery({ tags: ["js", "ts"] })
 *    => "tags=js&tags=ts"
 * 
 * 3. 过滤 undefined：
 *    stringifyQuery({ a: 1, b: undefined, c: "3" })
 *    => "a=1&c=3"
 * 
 * 4. 复杂对象：
 *    stringifyQuery({
 *      user: { name: "张三" },
 *      tags: ["js", "ts"],
 *      active: true
 *    })
 *    => "user=%7B%22name%22%3A%22张三%22%7D&tags=js&tags=ts&active=true"
 */
export function stringifyQuery(query: QueryObject): string {
  return Object.keys(query)
    .filter((k) => query[k] !== undefined)  // 过滤掉 undefined 值
    .map((k) => encodeQueryItem(k, query[k]))  // 编码每个键值对
    .filter(Boolean)  // 过滤掉空字符串
    .join("&");  // 用 & 连接
}
