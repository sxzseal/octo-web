import React, { useState, useEffect, useCallback } from 'react';
import FileViewer from '../FileViewer/FileViewer';
import '../FileViewer/FileViewer.css';
import type { FileGroup, FileContent } from '../FileViewer/FileViewer';
import AgentCardService from '../../Service/AgentCardService';
import './ClawCoreFilesTab.css';

export interface ClawCoreFilesTabProps {
  /** Bot ID */
  botId: string;
  /** 容器高度（默认 "100%"） */
  height?: string;
}

/**
 * ClawCoreFilesTab - Tab ③ 核心文件
 * 
 * 展示 Agent 的核心文件（AGENTS.md / SOUL.md / IDENTITY.md 等）和记忆文件。
 * 内部复用 FileViewer 组件，数据从 agent-card-server 获取。
 * 
 * @example
 * ```tsx
 * <ClawCoreFilesTab botId="01913a2b3c4d5e6f7890abcd_bot" />
 * ```
 */
export default function ClawCoreFilesTab({ botId, height = '100%' }: ClawCoreFilesTabProps) {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFileGroups = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    setError(null);

    try {
      const agentCard = await AgentCardService.getAgentCard(botId);
      if (signal?.cancelled) return; // 如果已取消，忽略结果
      const groups = AgentCardService.buildFileGroups(agentCard);
      setFileGroups(groups);
    } catch (err) {
      if (signal?.cancelled) return;
      console.error('Failed to load file groups:', err);
      setError('加载文件列表失败，请稍后重试');
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
      }
    }
  }, [botId]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadFileGroups(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadFileGroups]);

  const handleFetchFile = async (path: string): Promise<FileContent> => {
    return await AgentCardService.getFileContent(botId, path);
  };

  if (loading) {
    return (
      <div className="claw-core-files-tab" data-testid="claw-core-files-tab-loading" style={{ height }}>
        <div className="loading-state">
          <div className="loading-spinner" />
          <div className="loading-text">加载中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="claw-core-files-tab" data-testid="claw-core-files-tab-error" style={{ height }}>
        <div className="error-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="error-icon"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="error-text">{error}</div>
          <button 
            className="retry-button" 
            onClick={() => loadFileGroups({ cancelled: false })}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (fileGroups.length === 0) {
    return (
      <div className="claw-core-files-tab" data-testid="claw-core-files-tab-empty" style={{ height }}>
        <div className="empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="empty-icon"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div className="empty-text">暂无核心文件</div>
        </div>
      </div>
    );
  }

  return (
    <div className="claw-core-files-tab" data-testid="claw-core-files-tab">
      <FileViewer
        groups={fileGroups}
        onFetchFile={handleFetchFile}
        height={height}
      />
    </div>
  );
}

export { ClawCoreFilesTab };
