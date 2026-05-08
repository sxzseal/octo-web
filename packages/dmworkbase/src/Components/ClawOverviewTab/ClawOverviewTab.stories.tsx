import type { Meta, StoryObj } from '@storybook/react';
import ClawOverviewTab from './ClawOverviewTab';
import type { RuntimeInfo } from './ClawOverviewTab';

const mockRuntimeInfo: RuntimeInfo = {
  os_version: 'macOS 13.2.1',
  arch: 'arm64',
  disk_space_gb: 68.0,
  memory_gb: 32.0,
  app_data_dir: '.octopush/octopush-58d651',
  claw_version: 'v2026.4.11',
  admin_url: 'http://localhost:3100',
  team_name: 'DeepMiner Team',
  process_status: 'running',
  gateway_status: 'connected',
  gateway_name: 'Gateway-1',
  claw_id: 'claw-a8f3d2e1',
  gateway_total_agents: 10,
  gateway_alive_agents: 8,
  nodejs_version: 'v22.22.2',
  network_latency_ms: 45.2,
  last_heartbeat_at: '2026-05-07T10:31:00Z',
  memory_retention_count: 50,
  memory_retention_note: '保留最近50天记忆，已清理3条过期记录',
};

const meta = {
  title: 'Components/ClawOverviewTab',
  component: ClawOverviewTab,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ClawOverviewTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    runtimeInfo: mockRuntimeInfo,
  },
};

export const HighLatency: Story = {
  args: {
    runtimeInfo: {
      ...mockRuntimeInfo,
      network_latency_ms: 126.43,
    },
  },
};

export const GatewayDisconnected: Story = {
  args: {
    runtimeInfo: {
      ...mockRuntimeInfo,
      gateway_status: 'disconnected',
      process_status: 'idle',
    },
  },
};

export const Loading: Story = {
  args: {
    runtimeInfo: mockRuntimeInfo,
    loading: true,
  },
};

export const WithRecheckButton: Story = {
  args: {
    runtimeInfo: mockRuntimeInfo,
    onRecheck: () => alert('重新检查健康状态'),
  },
};
