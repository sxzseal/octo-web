import APIClient from './APIClient';
import FileHelper from '../Utils/filehelper';
import type {
  AgentCardData,
  RuntimeInfo,
  SessionInfo,
  CoreFile,
  MemoryFile,
} from '@octo/contacts';

/**
 * AgentCardService
 * 
 * 封装 agent-card-server 接口调用，获取 Agent 运行时信息
 * 
 * 类型定义统一使用 @octo/contacts/api/types
 */

/** 文件分组 */
export interface FileGroup {
  label: string;
  files: FileItem[];
}

/** 文件项 */
export interface FileItem {
  name: string;
  path: string;
  size: string;
}

/** 文件内容 */
export interface FileContent {
  name: string;
  size: string;
  mtime: string;
  content: string;
}

/** 
 * Agent Card 数据（向后兼容别名）
 * 注意：dmworkcontacts/api/types 中的 AgentCardResponse 是 HTTP 响应封装 { code, message, data }
 * 这里的 AgentCardResponse 指的是数据载荷本身（即 AgentCardData）
 */
export type AgentCardResponse = AgentCardData;

/** Session 别名（兼容旧代码） */
export type Session = SessionInfo;

/** 导出共享类型 */
export type { RuntimeInfo, SessionInfo, CoreFile, MemoryFile };

/** 文件内容响应 */
export interface FileContentResponse {
  bot_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  content: string;
  last_synced_at: string;
}

class AgentCardService {
  // AgentCardService 使用 APIClient.shared，路径自动继承 axios.defaults.baseURL (/api/v1/)
  // 所以接口路径只需要写相对路径，如 /agent-cards/:botId

  /**
   * 获取 Agent Card（包含概览、Session、文件列表）
   * @param botId Bot ID
   * @returns AgentCardResponse
   */
  async getAgentCard(botId: string): Promise<AgentCardResponse> {
    const response = await APIClient.shared.get<{ code: number; message: string; data: AgentCardResponse }>(
      `/agent-cards/${botId}`
    );

    if (response.code !== 0) {
      throw new Error(response.message || 'Failed to fetch agent card');
    }

    return response.data;
  }

  /**
   * 获取文件内容
   * @param botId Bot ID
   * @param fileName 文件路径（如 AGENTS.md 或 memory/2026-05-07.md）
   * @returns FileContent
   */
  async getFileContent(botId: string, fileName: string): Promise<FileContent> {
    const response = await APIClient.shared.get<{ code: number; message: string; data: FileContentResponse }>(
      `/agent-cards/${botId}/files/${fileName}`
    );

    if (response.code !== 0) {
      throw new Error(response.message || 'Failed to fetch file content');
    }

    const data = response.data;
    return {
      name: data.file_name,
      size: FileHelper.formatFileSize(data.file_size),
      mtime: this.formatTime(data.last_synced_at),
      content: data.content,
    };
  }

  /**
   * 将 AgentCardResponse 转换为 FileViewer 所需的 FileGroup[]
   * @param agentCard AgentCardResponse
   * @returns FileGroup[]
   */
  buildFileGroups(agentCard: AgentCardResponse): FileGroup[] {
    const groups: FileGroup[] = [];

    // 按 category 分组核心文件
    const identityFiles: CoreFile[] = [];
    const toolsFiles: CoreFile[] = [];
    const otherFiles: CoreFile[] = [];

    agentCard.core_files.forEach((file) => {
      if (file.category === 'identity') {
        identityFiles.push(file);
      } else if (file.category === 'tools') {
        toolsFiles.push(file);
      } else {
        otherFiles.push(file);
      }
    });

    if (identityFiles.length > 0) {
      groups.push({
        label: '身份与人格',
        files: identityFiles.map((f) => ({
          name: f.file_name,
          path: f.file_name,
          size: FileHelper.formatFileSize(f.file_size),
        })),
      });
    }

    if (toolsFiles.length > 0) {
      groups.push({
        label: '工具与行为',
        files: toolsFiles.map((f) => ({
          name: f.file_name,
          path: f.file_name,
          size: FileHelper.formatFileSize(f.file_size),
        })),
      });
    }

    if (otherFiles.length > 0) {
      groups.push({
        label: '其他',
        files: otherFiles.map((f) => ({
          name: f.file_name,
          path: f.file_name,
          size: FileHelper.formatFileSize(f.file_size),
        })),
      });
    }

    // 记忆文件单独分组
    if (agentCard.memory_files.length > 0) {
      groups.push({
        label: '记忆',
        files: agentCard.memory_files.map((f) => ({
          name: f.file_name,
          path: f.file_name,
          size: FileHelper.formatFileSize(f.file_size),
        })),
      });
    }

    return groups;
  }

  /**
   * 格式化时间
   * @param isoTime ISO 8601 时间字符串
   * @returns 格式化后的字符串（如 "2026-05-07 16:12"）
   */
  private formatTime(isoTime: string): string {
    const date = new Date(isoTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}

export default new AgentCardService();
