import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MatterDetail, MatterStatus } from '../../bridge/types';
import { getMatter, transitionMatter } from '../../api/todoApi';
import { Toast } from '../../utils/toast';
import UserName from '../../ui/UserName';
import './index.css';

export interface MatterDetailPanelProps {
  channelId: string;
  channelType: number;
  /** 直接传入 matter ID（从列表点击进入时） */
  matterId?: string;
  onClose: () => void;
}

type TabKey = 'channels' | 'outputs' | 'changelog';

/**
 * MatterDetailPanel — 事项详情面板
 *
 * 数据来源：GET /matters/:id 真实 API
 * 三 tab：关联群聊 / 产出文件 / 变更记录（后端暂不支持的显示空态）
 */
export default function MatterDetailPanel({ channelId, channelType, matterId, onClose }: MatterDetailPanelProps) {
  const [matter, setMatter] = useState<MatterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('channels');

  // 获取 matter 详情
  useEffect(() => {
    if (!matterId) {
      setMatter(null);
      return;
    }
    setLoading(true);
    setError(null);
    getMatter(matterId, channelId || undefined)
      .then((detail) => {
        setMatter(detail);
      })
      .catch((err) => {
        setError(err?.message || '加载失败');
        setMatter(null);
      })
      .finally(() => setLoading(false));
  }, [matterId, channelId]);

  // 状态切换
  const handleStatusChange = useCallback(async (newStatus: MatterStatus) => {
    if (!matter) return;
    const oldStatus = matter.status;
    // 乐观更新
    setMatter((prev) => prev ? { ...prev, status: newStatus } : prev);
    try {
      const updated = await transitionMatter(matter.id, newStatus);
      setMatter(updated);
    } catch {
      // 回滚
      setMatter((prev) => prev ? { ...prev, status: oldStatus } : prev);
      Toast.error('状态修改失败');
    }
  }, [matter]);

  // 空态
  if (!matterId) {
    return (
      <div className="wk-mp">
        <div className="wk-mp-head">
          <div className="wk-mp-head__row1">
            <span className="wk-mp-head__id">事项</span>
            <div className="wk-mp-head__actions">
              <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">✕</button>
            </div>
          </div>
        </div>
        <div className="wk-mp__scroll">
          <div className="wk-mp-empty">选择一个事项查看详情</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wk-mp">
        <div className="wk-mp-head">
          <div className="wk-mp-head__row1">
            <span className="wk-mp-head__id">加载中...</span>
            <div className="wk-mp-head__actions">
              <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">✕</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !matter) {
    return (
      <div className="wk-mp">
        <div className="wk-mp-head">
          <div className="wk-mp-head__row1">
            <span className="wk-mp-head__id">事项</span>
            <div className="wk-mp-head__actions">
              <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">✕</button>
            </div>
          </div>
        </div>
        <div className="wk-mp__scroll">
          <div className="wk-mp-empty">{error || '事项不存在'}</div>
        </div>
      </div>
    );
  }

  const channels = matter.channels || [];
  const assignees = matter.assignees || [];

  const tabs: { id: TabKey; label: string; count: number }[] = [
    { id: 'channels', label: '关联群聊', count: channels.length },
    { id: 'outputs', label: '产出文件', count: 0 },
    { id: 'changelog', label: '变更记录', count: 0 },
  ];

  return (
    <div className="wk-mp">
      {/* Head */}
      <div className="wk-mp-head">
        <div className="wk-mp-head__row1">
          <span className="wk-mp-head__id">{matter.id.slice(0, 8)}</span>
          <StatusPicker status={matter.status} onChange={handleStatusChange} />
          {matter.deadline && (
            <span className="wk-mp-head__ddl">
              <span className="wk-mp-head__ddl-label">截止</span>
              <span className="wk-mp-head__ddl-value">{new Date(matter.deadline).toLocaleDateString('zh-CN')}</span>
            </span>
          )}
          <div className="wk-mp-head__actions">
            <button type="button" className="wk-mp-head__close" onClick={onClose} aria-label="关闭">✕</button>
          </div>
        </div>
        <h2 className="wk-mp-head__title">{matter.title}</h2>
        <div className="wk-mp-head__people">
          {/* 创建人 */}
          <div className="wk-mp-head__person">
            <span className="wk-mp-head__avatar">{/* 首字占位 */}</span>
            <UserName uid={matter.creator_id} className="wk-mp-head__person-name" />
            <span className="wk-mp-head__person-role">创建人</span>
          </div>
          {/* 负责人 */}
          {assignees.length > 0 && (
            <div className="wk-mp-head__person">
              <span className="wk-mp-head__avatar-group">
                {assignees.map((a) => (
                  <span key={a.user_id} className="wk-mp-head__avatar">{/* 占位 */}</span>
                ))}
              </span>
              <span className="wk-mp-head__person-name">
                {assignees.map((a, i) => (
                  <span key={a.user_id}>
                    {i > 0 && '、'}
                    <UserName uid={a.user_id} />
                  </span>
                ))}
              </span>
              <span className="wk-mp-head__person-role">负责人</span>
            </div>
          )}
        </div>
        {matter.source_name && (
          <div className="wk-mp-head__source">#{matter.source_name}</div>
        )}
      </div>

      {/* 主要目标 */}
      {matter.description && (
        <div className="wk-mp-goal">
          <div className="wk-mp-goal__label">主要目标</div>
          <div className="wk-mp-goal__text">{matter.description}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="wk-mp-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`wk-mp-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count > 0 && <span className="wk-mp-tab__count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="wk-mp__scroll">
        {tab === 'channels' && (
          <div className="wk-mp-tab-content">
            {channels.length === 0 ? (
              <div className="wk-mp-empty">暂无关联群聊</div>
            ) : (
              channels.map((ch) => (
                <div key={ch.id} className="wk-mp-channel-item">
                  <span className="wk-mp-channel-item__name">#{ch.channel_name || ch.channel_id}</span>
                  <span className="wk-mp-channel-item__type">
                    {ch.channel_type === 2 ? '群组' : ch.channel_type === 1 ? '私聊' : '子区'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'outputs' && (
          <div className="wk-mp-tab-content">
            <div className="wk-mp-empty">产出文件功能即将上线</div>
          </div>
        )}
        {tab === 'changelog' && (
          <div className="wk-mp-tab-content">
            <div className="wk-mp-empty">变更记录功能即将上线</div>
          </div>
        )}
      </div>
    </div>
  );
}

export { MatterDetailPanel };

// ─── StatusPicker ─────────────────────────────────────────

const STATUS_OPTIONS: { value: MatterStatus; label: string; cssKey: string }[] = [
  { value: 'open', label: '进行中', cssKey: 'active' },
  { value: 'done', label: '已完成', cssKey: 'done' },
  { value: 'archived', label: '已归档', cssKey: 'archived' },
];

function StatusPicker({ status, onChange }: { status: MatterStatus; onChange: (s: MatterStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const current = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="wk-mp-status-picker" ref={ref}>
      <button
        type="button"
        className={`wk-mp-head__status wk-mp-head__status--${current.cssKey}`}
        onClick={() => setOpen(!open)}
      >
        <span className="wk-mp-head__status-dot" />
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="wk-mp-status-picker__dropdown">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`wk-mp-status-picker__option${opt.value === status ? ' is-active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span className={`wk-mp-head__status-dot`} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
