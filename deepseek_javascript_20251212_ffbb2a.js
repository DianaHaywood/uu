const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { app } = require('electron');

class FilePreviewManager {
  constructor() {
    this.previewCache = new Map();
    this.previewDir = path.join(app.getPath('userData'), 'preview_cache');
    
    // 创建预览目录
    if (!fs.existsSync(this.previewDir)) {
      fs.mkdirSync(this.previewDir, { recursive: true });
    }
  }

  async generatePreview(filePath, fileType) {
    const cacheKey = `${filePath}_${fs.statSync(filePath).mtimeMs}`;
    
    // 检查缓存
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey);
    }

    let previewData = null;
    
    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          previewData = await this.generatePDFPreview(filePath);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
          previewData = await this.generateImagePreview(filePath);
          break;
        case 'txt':
        case 'log':
          previewData = await this.generateTextPreview(filePath);
          break;
        default:
          previewData = await this.generateGenericPreview(filePath);
      }
      
      // 缓存结果
      this.previewCache.set(cacheKey, previewData);
      
      // 定期清理过期缓存
      setTimeout(() => this.cleanupCache(), 3600000); // 每小时清理一次
      
      return previewData;
    } catch (error) {
      console.error('预览生成失败:', error);
      return this.generateErrorPreview(fileType);
    }
  }

  async generateImagePreview(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        
        const base64Data = data.toString('base64');
        const mimeType = this.getMimeType(filePath);
        
        resolve({
          type: 'image',
          data: `data:${mimeType};base64,${base64Data}`,
          thumbnail: this.createThumbnail(data, mimeType)
        });
      });
    });
  }

  async generateTextPreview(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) reject(err);
        
        // 限制预览文本长度
        const previewText = data.length > 10000 
          ? data.substring(0, 10000) + '...' 
          : data;
        
        resolve({
          type: 'text',
          data: previewText,
          encoding: 'utf-8',
          lines: previewText.split('\n').length
        });
      });
    });
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.previewCache.entries()) {
      if (now - value.timestamp > 3600000) { // 1小时过期
        this.previewCache.delete(key);
      }
    }
  }
}

module.exports = new FilePreviewManager();