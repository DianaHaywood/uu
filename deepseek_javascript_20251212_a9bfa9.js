const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class AutoSaveService {
  constructor() {
    this.interval = 5 * 60 * 1000; // 5分钟
    this.timer = null;
    this.savePath = path.join(app.getPath('userData'), 'autosave');
    
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  start() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      this.performAutoSave();
    }, this.interval);
    
    console.log('自动保存服务已启动');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('自动保存服务已停止');
  }

  async performAutoSave() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.savePath, `backup_${timestamp}.json`);
      
      // 获取当前所有数据
      const allData = {
        projects: await db.query('SELECT * FROM projects'),
        files: await db.query('SELECT * FROM process_files'),
        schedule: await db.query('SELECT * FROM schedule_nodes'),
        settings: await db.query('SELECT * FROM user_settings'),
        timestamp: new Date().toISOString()
      };
      
      // 保存到文件
      fs.writeFileSync(backupFile, JSON.stringify(allData, null, 2), 'utf-8');
      
      // 清理旧备份（保留最近10个）
      this.cleanupOldBackups();
      
      console.log(`自动保存完成: ${backupFile}`);
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }

  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.savePath)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(this.savePath, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);
      
      // 删除超过10个的旧备份
      if (files.length > 10) {
        files.slice(10).forEach(file => {
          fs.unlinkSync(path.join(this.savePath, file.name));
        });
      }
    } catch (error) {
      console.error('清理备份失败:', error);
    }
  }

  getLatestBackup() {
    try {
      const files = fs.readdirSync(this.savePath)
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(this.savePath, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);
      
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error('获取备份失败:', error);
      return null;
    }
  }
}

module.exports = new AutoSaveService();