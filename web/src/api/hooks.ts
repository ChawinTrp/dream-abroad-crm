import { useState, useEffect, useCallback } from 'react';
import { api } from './client';

export function useFetch<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, refetch, setData };
}

export function useMutation<T>(path: string, method: 'patch' | 'post' | 'del' = 'patch') {
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (data?: unknown): Promise<T> => {
      setLoading(true);
      try {
        const fn = method === 'del' ? api.del : method === 'post' ? api.post : api.patch;
        return await fn<T>(path, data);
      } finally {
        setLoading(false);
      }
    },
    [path, method],
  );

  return { mutate, loading };
}
