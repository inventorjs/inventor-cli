/**
 * 任务管理器
 * @author: sunkeysun
 */
export async function series(tasks: Promise<unknown>[]) {
  const results = []
  for (const task of tasks) {
    const result = await task
    results.push(result)
  }
  return results
}
