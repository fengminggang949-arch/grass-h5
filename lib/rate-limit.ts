const buckets = new Map<string, number[]>();
export function allowRequest(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now(); const recent=(buckets.get(key)||[]).filter((time)=>now-time<windowMs);
  if(recent.length>=limit)return false; recent.push(now); buckets.set(key,recent);
  if(buckets.size>2000) for(const [id,times] of buckets) if(!times.some((time)=>now-time<windowMs)) buckets.delete(id);
  return true;
}
