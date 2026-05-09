/**
 * useAgentCard Hook
 * 
 * 用于获取 Agent Card 数据
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAgentCard } from '../api/agentCardApi';
import type { AgentCardData } from '../api/types';

interface UseAgentCardResult {
  /** Agent Card 数据 */
  data: AgentCardData | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新加载 */
  refetch: () => Promise<void>;
}

/**
 * 获取 Agent Card 数据
 * 
 * @param botId - Bot ID
 * @param options - 选项
 * @returns Agent Card 数据、加载状态、错误信息
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useAgentCard('pipixia_bot');
 * ```
 */
export function useAgentCard(
  botId: string | null,
  options?: {
    /** 是否启用自动加载（默认 true） */
    enabled?: boolean;
  },
): UseAgentCardResult {
  const [data, setData] = useState<AgentCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const enabled = options?.enabled ?? true;

  // 统一的加载函数，带取消机制
  const loadData = useCallback(async (signal: { cancelled: boolean }) => {
    if (!botId || !enabled) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getAgentCard(botId);
      if (signal.cancelled) return; // 如果已取消，忽略结果
      setData(result);
      setError(null);
    } catch (err) {
      if (signal.cancelled) return;
      const message = err instanceof Error ? err.message : 'Failed to fetch agent card';
      setError(message);
      setData(null);
    } finally {
      if (!signal.cancelled) {
        setLoading(false);
      }
    }
  }, [botId, enabled]);

  // 自动加载（依赖 botId 和 enabled 变化）
  useEffect(() => {
    const signal = { cancelled: false };
    cancelRef.current = signal;
    
    void loadData(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadData]);

  // refetch 使用相同的 loadData，但创建新的 signal
  const refetch = useCallback(async () => {
    // 先取消旧请求
    if (cancelRef.current) {
      cancelRef.current.cancelled = true;
    }
    const signal = { cancelled: false };
    cancelRef.current = signal;
    await loadData(signal);
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
