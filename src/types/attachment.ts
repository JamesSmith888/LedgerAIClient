// 存储类型
export type StorageType = 'cloud' | 'local';

// 云端附件
export interface Attachment {
  id: number;
  transactionId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  uploadedByUserId: number;
  createTime: string;
  hasThumbnail: boolean;
  storageType: 'cloud'; // 云端存储
}

// 本地附件
export interface LocalAttachment {
  id: string; // 本地UUID
  transactionId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  width?: number;
  height?: number;
  localPath: string; // 本地文件路径
  thumbnailPath?: string; // 本地缩略图路径
  createTime: string;
  storageType: 'local'; // 本地存储
}

// 统一的附件类型
export type UnifiedAttachment = Attachment | LocalAttachment;

export interface AttachmentUploadResult {
  id: number;
  fileName: string;
  fileSize: number;
}

// 存储选项说明
export interface StorageOption {
  type: StorageType;
  title: string;
  description: string;
  icon: string;
  pros: string[];
  cons: string[];
}
