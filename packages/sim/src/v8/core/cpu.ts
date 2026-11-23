// A brick that exactly fits gets its effect. A brick that would overspend
// consumes the remaining budget without running. Both end this tick.
export function chargeCpu(used: number, limit: number, cost: number) {
  const total = used + cost
  return { used: Math.min(total, limit), allowed: used < limit && total <= limit, exhausted: total >= limit }
}
