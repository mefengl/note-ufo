/**
 * Punycode 编码实现
 * 
 * Punycode 是一种特殊的编码方式，用于将包含非 ASCII 字符的域名转换为纯 ASCII 字符表示。
 * 这个实现是基于 punycode@2.1.1 的精简版本，仅保留了 toASCII 功能。
 * 
 * 为什么需要 Punycode？
 * 1. DNS 系统历史上只支持 ASCII 字符
 * 2. 现代网络需要支持国际化域名（IDN，如中文域名）
 * 3. Punycode 在保证兼容性的同时支持了国际化
 * 
 * 编码示例：
 * - "münich.de" => "xn--mnich-kva.de"
 * - "中国.cn" => "xn--fiqs8s.cn"
 * 
 * 实现原理：
 * 1. 将 Unicode 字符串分离为 ASCII 和非 ASCII 部分
 * 2. ASCII 部分保持不变
 * 3. 非 ASCII 部分转换为特殊的数字编码
 * 4. 添加 "xn--" 前缀标识这是 Punycode 编码
 */

/* eslint-disable */
// @ts-nocheck

// 基础正则表达式定义
const n = /[^\0-\x7E]/;              // 匹配任何非 ASCII 字符
const t = /[\x2E\u3002\uFF0E\uFF61]/g; // 匹配各种形式的点（.）包括全角版本

// 错误信息定义
const o = {
  overflow: "Overflow Error",        // 数值溢出错误
  "not-basic": "Illegal Input",      // 非法输入错误
  "invalid-input": "Invalid Input",  // 无效输入错误
};

// 基础工具函数
const e = Math.floor;                // 向下取整
const r = String.fromCharCode;       // 将数字码点转换为字符

/**
 * 抛出编码过程中的错误
 * @param {string} n - 错误类型
 * @throws {RangeError} 带有具体错误信息的异常
 */
function s(n) {
  throw new RangeError(o[n]);
}

/**
 * 计算 Punycode 编码中的数字到 ASCII 字符的映射
 * 
 * @param {number} n - 待转换的数字
 * @param {number} t - 大小写标志
 * @returns {number} ASCII 字符码点
 * 
 * 原理：将数字映射到 a-z, A-Z, 0-9 等 ASCII 字符
 */
const c = function (n, t) {
  return n + 22 + 75 * (n < 26) - ((t != 0) << 5);
};

/**
 * 计算编码偏移值
 * 实现了 Punycode 算法的核心偏移计算逻辑
 * 
 * @param {number} n - 输入值
 * @param {number} t - 基数
 * @param {boolean} o - 是否第一次处理
 * @returns {number} 计算后的偏移值
 */
const u = function (n, t, o) {
  let r = 0;
  for (n = o ? e(n / 700) : n >> 1, n += e(n / t); n > 455; r += 36) {
    n = e(n / 35);
  }
  return e(r + (36 * n) / (n + 38));
};

/**
 * 将域名转换为 Punycode ASCII 形式
 * 
 * 功能：
 * 1. 处理包含非 ASCII 字符的域名
 * 2. 保持 ASCII 部分不变
 * 3. 转换非 ASCII 部分为 Punycode
 * 
 * @param {string} o - 输入域名
 * @returns {string} Punycode 编码后的域名
 * 
 * 使用示例：
 * toASCII("测试.com") => "xn--0zwm56d.com"
 * toASCII("test.com") => "test.com"（纯 ASCII 保持不变）
 */
export function toASCII(o) {
  // 处理邮箱地址中的域名部分
  return (function (n, o) {
    // 分离邮箱中的用户名和域名部分
    const e = n.split("@");
    let r = "";
    e.length > 1 && ((r = e[0] + "@"), (n = e[1]));

    // 处理域名中的每个部分（以点分隔）
    const s = (function (n, t) {
      const o = [];
      let e = n.length;
      for (; e--; ) {
        o[e] = t(n[e]);
      }
      return o;
    })((n = n.replace(t, ".")).split("."), o).join(".");

    return r + s;
  })(o, function (t) {
    // 如果包含非 ASCII 字符，进行 Punycode 编码
    return n.test(t)
      ? "xn--" +
          (function (n) {
            // Unicode 编码处理
            const t = [];
            const o = (n = (function (n) {
              const t = [];
              let o = 0;
              const e = n.length;
              // 处理 Unicode 代理对
              for (; o < e; ) {
                const r = n.charCodeAt(o++);
                if (r >= 55296 && r <= 56319 && o < e) {
                  const e = n.charCodeAt(o++);
                  (64512 & e) == 56320
                    ? t.push(((1023 & r) << 10) + (1023 & e) + 65536)
                    : (t.push(r), o--);
                } else {
                  t.push(r);
                }
              }
              return t;
            })(n)).length;

            // Punycode 编码的核心算法实现
            let f = 128;
            let i = 0;
            let l = 72;

            // 处理基础 ASCII 字符
            for (const o of n) {
              o < 128 && t.push(r(o));
            }

            // 处理非 ASCII 字符
            const h = t.length;
            let p = h;
            for (h && t.push("-"); p < o; ) {
              let o = 2147483647;
              for (const t of n) {
                t >= f && t < o && (o = t);
              }
              const a = p + 1;
              o - f > e((2147483647 - i) / a) && s("overflow"),
                (i += (o - f) * a),
                (f = o);
              for (const o of n) {
                if ((o < f && ++i > 2147483647 && s("overflow"), o == f)) {
                  let n = i;
                  for (let o = 36; ; o += 36) {
                    const s = o <= l ? 1 : o >= l + 26 ? 26 : o - l;
                    if (n < s) {
                      break;
                    }
                    const u = n - s;
                    const f = 36 - s;
                    t.push(r(c(s + (u % f), 0))), (n = e(u / f));
                  }
                  t.push(r(c(n, 0))), (l = u(i, a, p == h)), (i = 0), ++p;
                }
              }
              ++i, ++f;
            }
            return t.join("");
          })(t)
      : t;
  });
}
