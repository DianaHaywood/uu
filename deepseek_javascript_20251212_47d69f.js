const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'project_management.db');
    this.init();
  }

  init() {
    // 确保数据库目录存在
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
      } else {
        console.log('数据库连接成功');
        this.createTables();
      }
    });
  }

  createTables() {
    // 项目表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_code TEXT UNIQUE NOT NULL,
        project_name TEXT NOT NULL,
        project_type TEXT,
        security_level TEXT DEFAULT '秘密',
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT '进行中',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 过程文件表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS process_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        upload_user TEXT,
        version TEXT DEFAULT '1.0',
        security_level TEXT DEFAULT '内部',
        tags TEXT,
        description TEXT,
        preview_path TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 进度节点表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schedule_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        node_name TEXT NOT NULL,
        node_type TEXT NOT NULL,
        planned_date DATE,
        actual_date DATE,
        status TEXT DEFAULT '未开始',
        completion_rate INTEGER DEFAULT 0,
        responsible_person TEXT,
        related_files TEXT,
        notes TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 用户配置表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT UNIQUE NOT NULL,
        default_project_path TEXT,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'zh-CN',
        notification_enabled INTEGER DEFAULT 1,
        auto_save_interval INTEGER DEFAULT 5,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // 通用查询方法
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // 通用执行方法
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
}

module.exports = new DatabaseManager();