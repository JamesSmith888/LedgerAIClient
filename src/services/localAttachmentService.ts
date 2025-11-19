/**
 * 本地附件存储服务
 * 使用 React Native File System (RNFS) 管理本地文件
 */
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalAttachment } from '../types/attachment';

// 基础目录
const ATTACHMENTS_DIR = `${RNFS.DocumentDirectoryPath}/attachments`;

/**
 * 本地附件管理服务
 */
class LocalAttachmentService {
  
  /**
   * 初始化附件目录
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    const exists = await RNFS.exists(path);
    if (!exists) {
      await RNFS.mkdir(path);
    }
  }

  /**
   * 获取交易的附件目录
   */
  private getTransactionDir(transactionId: number): string {
    return `${ATTACHMENTS_DIR}/${transactionId}`;
  }

  /**
   * 获取元数据存储key
   */
  private getMetadataKey(transactionId: number): string {
    return `transaction_attachments_${transactionId}`;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存附件到本地
   */
  async saveAttachment(
    transactionId: number,
    uri: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    width?: number,
    height?: number
  ): Promise<LocalAttachment> {
    try {
      // 确保目录存在
      const transactionDir = this.getTransactionDir(transactionId);
      await this.ensureDirectoryExists(ATTACHMENTS_DIR);
      await this.ensureDirectoryExists(transactionDir);

      // 生成唯一文件名
      const id = this.generateId();
      const ext = fileName.split('.').pop() || 'jpg';
      const newFileName = `${id}.${ext}`;
      const localPath = `${transactionDir}/${newFileName}`;

      // 复制文件到本地目录
      await RNFS.copyFile(uri, localPath);

      // 创建附件对象
      const attachment: LocalAttachment = {
        id,
        transactionId,
        fileName,
        fileType,
        fileSize,
        width,
        height,
        localPath,
        createTime: new Date().toISOString(),
        storageType: 'local',
      };

      // 保存元数据
      await this.saveMetadata(transactionId, attachment);

      return attachment;
    } catch (error) {
      console.error('保存本地附件失败:', error);
      throw new Error('保存附件失败');
    }
  }

  /**
   * 保存元数据到 AsyncStorage
   */
  private async saveMetadata(transactionId: number, attachment: LocalAttachment): Promise<void> {
    const key = this.getMetadataKey(transactionId);
    const existing = await this.getAttachments(transactionId);
    existing.push(attachment);
    await AsyncStorage.setItem(key, JSON.stringify(existing));
  }

  /**
   * 获取交易的所有附件
   */
  async getAttachments(transactionId: number): Promise<LocalAttachment[]> {
    try {
      const key = this.getMetadataKey(transactionId);
      const data = await AsyncStorage.getItem(key);
      if (!data) {
        return [];
      }
      const attachments: LocalAttachment[] = JSON.parse(data);
      
      // 验证文件是否仍然存在
      const validAttachments: LocalAttachment[] = [];
      for (const attachment of attachments) {
        const exists = await RNFS.exists(attachment.localPath);
        if (exists) {
          validAttachments.push(attachment);
        }
      }
      
      // 如果有文件丢失，更新元数据
      if (validAttachments.length !== attachments.length) {
        await AsyncStorage.setItem(key, JSON.stringify(validAttachments));
      }
      
      return validAttachments;
    } catch (error) {
      console.error('获取本地附件失败:', error);
      return [];
    }
  }

  /**
   * 删除附件
   */
  async deleteAttachment(transactionId: number, attachmentId: string): Promise<void> {
    try {
      const attachments = await this.getAttachments(transactionId);
      const attachment = attachments.find(a => a.id === attachmentId);
      
      if (!attachment) {
        throw new Error('附件不存在');
      }

      // 删除文件
      const exists = await RNFS.exists(attachment.localPath);
      if (exists) {
        await RNFS.unlink(attachment.localPath);
      }

      // 删除缩略图（如果存在）
      if (attachment.thumbnailPath) {
        const thumbExists = await RNFS.exists(attachment.thumbnailPath);
        if (thumbExists) {
          await RNFS.unlink(attachment.thumbnailPath);
        }
      }

      // 更新元数据
      const remaining = attachments.filter(a => a.id !== attachmentId);
      const key = this.getMetadataKey(transactionId);
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    } catch (error) {
      console.error('删除本地附件失败:', error);
      throw new Error('删除附件失败');
    }
  }

  /**
   * 删除交易的所有附件
   */
  async deleteTransactionAttachments(transactionId: number): Promise<void> {
    try {
      // 删除目录
      const transactionDir = this.getTransactionDir(transactionId);
      const exists = await RNFS.exists(transactionDir);
      if (exists) {
        await RNFS.unlink(transactionDir);
      }

      // 删除元数据
      const key = this.getMetadataKey(transactionId);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('删除交易附件失败:', error);
      throw new Error('删除附件失败');
    }
  }

  /**
   * 获取附件总大小
   */
  async getTotalSize(transactionId: number): Promise<number> {
    const attachments = await this.getAttachments(transactionId);
    return attachments.reduce((sum, att) => sum + att.fileSize, 0);
  }

  /**
   * 获取所有交易的附件总大小
   */
  async getAllAttachmentsSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const attachmentKeys = keys.filter(key => key.startsWith('transaction_attachments_'));
      
      let totalSize = 0;
      for (const key of attachmentKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const attachments: LocalAttachment[] = JSON.parse(data);
          totalSize += attachments.reduce((sum, att) => sum + att.fileSize, 0);
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('计算总大小失败:', error);
      return 0;
    }
  }

  /**
   * 清理孤立文件（文件存在但元数据不存在）
   */
  async cleanOrphanedFiles(): Promise<void> {
    try {
      const exists = await RNFS.exists(ATTACHMENTS_DIR);
      if (!exists) {
        return;
      }

      const transactionDirs = await RNFS.readDir(ATTACHMENTS_DIR);
      
      for (const dir of transactionDirs) {
        if (dir.isDirectory()) {
          const transactionId = parseInt(dir.name, 10);
          if (isNaN(transactionId)) {
            // 无效的目录名，删除
            await RNFS.unlink(dir.path);
            continue;
          }

          const key = this.getMetadataKey(transactionId);
          const metadata = await AsyncStorage.getItem(key);
          
          if (!metadata) {
            // 没有元数据，删除整个目录
            await RNFS.unlink(dir.path);
          }
        }
      }
    } catch (error) {
      console.error('清理孤立文件失败:', error);
    }
  }

  /**
   * 获取文件的URI（用于Image组件显示）
   */
  getFileUri(localPath: string): string {
    return `file://${localPath}`;
  }
}

export const localAttachmentService = new LocalAttachmentService();
