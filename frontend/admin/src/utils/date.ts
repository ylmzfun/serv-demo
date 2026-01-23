// 日期格式化工具

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss 格式
 * @param date 日期对象或日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date 日期对象或日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDateOnly(date: Date | string | number): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 获取当前日期时间
 * @returns 当前日期时间对象
 */
export function getCurrentDate(): Date {
  return new Date()
}

/**
 * 计算两个日期之间的天数差
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 天数差
 */
export function getDaysDifference(startDate: Date | string | number, endDate: Date | string | number): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const timeDiff = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}
