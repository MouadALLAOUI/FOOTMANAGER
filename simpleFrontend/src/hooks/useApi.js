import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

const SOURCE_KEY_MAX = 300
const sourceKeyCache = new Map()

function fnKey(fn) {
  if (typeof fn !== 'function') return 'anon'
  try {
    const src = fn.toString().replace(/\s+/g, ' ').slice(0, SOURCE_KEY_MAX)
    const hit = sourceKeyCache.get(src)
    if (hit) return hit
    let h = 5381
    for (let i = 0; i < src.length; i += 1) {
      h = ((h << 5) + h + src.charCodeAt(i)) | 0
    }
    const key = `fn${h >>> 0}`
    sourceKeyCache.set(src, key)
    return key
  } catch {
    return 'anon'
  }
}

export function useApi(fn, deps = [], options = {}) {
  const {
    queryKey,
    enabled,
    staleTime,
    keepPrevious,
    placeholderData,
    select,
  } = options

  const query = useQuery({
    queryKey: queryKey ?? ['api', fnKey(fn), ...deps],
    queryFn: fn,
    enabled,
    staleTime: staleTime ?? 60 * 1000,
    placeholderData: keepPrevious || placeholderData ? keepPreviousData : undefined,
    select,
  })

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.response?.data?.message || (query.error ? 'حدث خطأ أثناء التحميل' : ''),
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
    status: query.status,
  }
}

export function useMutationApi(mutateFn, options = {}) {
  const mutation = useMutation({
    mutationFn: mutateFn,
    onSuccess: options.onSuccess,
    onError: options.onError,
  })
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.response?.data?.message || (mutation.error ? 'حدث خطأ' : ''),
  }
}
