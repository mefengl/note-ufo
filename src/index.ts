/**
 * UFO (URL For Objects) 库的主入口文件
 * 
 * 这个文件统一导出了所有的 URL 处理工具函数：
 * 1. encoding.ts - URL 编码/解码工具
 * 2. parse.ts    - URL 解析工具
 * 3. query.ts    - 查询字符串处理工具
 * 4. url.ts      - URL 对象实现
 * 5. utils.ts    - 通用工具函数
 * 
 * 使用方式：
 * ```typescript
 * // 导入所有工具
 * import * as ufo from 'ufo'
 * 
 * // 按需导入特定函数
 * import { parseURL, normalizeURL } from 'ufo'
 * 
 * // CommonJS 环境
 * const { parseURL } = require('ufo')
 * ```
 */

export * from "./encoding";
export * from "./parse";
export * from "./query";
export * from "./url";
export * from "./utils";
