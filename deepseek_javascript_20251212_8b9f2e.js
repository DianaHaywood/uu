import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Table, Button, Upload, Modal, Progress, Tag } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  DashboardOutlined,
  ScheduleOutlined,
  SecurityScanOutlined,
  UploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { ipcRenderer } = window.require('electron');

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await ipcRenderer.invoke('get-projects');
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
        loadProjectFiles(data[0].id);
      }
    } catch (error) {
      console.error('加载项目失败:', error);
    }
  };

  const loadProjectFiles = async (projectId) => {
    try {
      const data = await ipcRenderer.invoke('get-project-files', projectId);
      setFiles(data);
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  };

  const handleFileUpload = async () => {
    try {
      const filePaths = await ipcRenderer.invoke('select-files');
      
      if (filePaths.length > 0) {
        const uploadPromises = filePaths.map(async (filePath) => {
          const stats = await fs.promises.stat(filePath);
          
          return {
            project_id: selectedProject.id,
            file_name: path.basename(filePath),
            file_path: filePath,
            file_type: path.extname(filePath).substring(1),
            file_size: stats.size,
            upload_user: '当前用户',
            security_level: '内部'
          };
        });

        const fileData = await Promise.all(uploadPromises);
        await ipcRenderer.invoke('save-files', fileData);
        
        loadProjectFiles(selectedProject.id);
        
        Modal.success({
          title: '上传成功',
          content: `成功上传 ${filePaths.length} 个文件`,
        });
      }
    } catch (error) {
      Modal.error({
        title: '上传失败',
        content: error.message,
      });
    }
  };

  const handlePreview = async (file) => {
    try {
      const previewData = await ipcRenderer.invoke('get-file-preview', file.file_path);
      setPreviewFile({
        ...file,
        preview: previewData
      });
      setPreviewVisible(true);
    } catch (error) {
      Modal.error({
        title: '预览失败',
        content: '无法预览此文件类型',
      });
    }
  };

  const handleDeleteFile = (fileId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此文件记录吗？（原始文件不会被删除）',
      onOk: async () => {
        await ipcRenderer.invoke('delete-file', fileId);
        loadProjectFiles(selectedProject.id);
      },
    });
  };

  const columns = [
    {
      title: '文件名称',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FileOutlined style={{ marginRight: 8 }} />
          <span>{text}</span>
          {record.security_level === '秘密' && (
            <SecurityScanOutlined style={{ color: '#f5222d', marginLeft: 8 }} />
          )}
        </div>
      ),
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 100,
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: '安全等级',
      dataIndex: 'security_level',
      key: 'security_level',
      width: 100,
      render: (level) => {
        const colors = {
          '公开': 'green',
          '内部': 'blue',
          '秘密': 'orange',
          '机密': 'red'
        };
        return <Tag color={colors[level] || 'default'}>{level}</Tag>;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'upload_date',
      key: 'upload_date',
      width: 150,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => ipcRenderer.invoke('open-file', record.file_path)}
          >
            打开
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteFile(record.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="light" collapsedWidth={80}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2>军工项目管理</h2>
          <Tag color="red" style={{ marginTop: 8 }}>涉密系统</Tag>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedProject?.id]}
          items={projects.map(project => ({
            key: project.id,
            icon: <FolderOutlined />,
            label: project.project_name,
            onClick: () => {
              setSelectedProject(project);
              loadProjectFiles(project.id);
            },
          }))}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>
            {selectedProject ? selectedProject.project_name : '选择项目'}
          </h2>
          <div>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleFileUpload}
              style={{ marginRight: 8 }}
            >
              上传文件
            </Button>
          </div>
        </Header>
        
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card title="项目概况">
                {selectedProject && (
                  <>
                    <p><strong>项目代号:</strong> {selectedProject.project_code}</p>
                    <p><strong>安全等级:</strong> {selectedProject.security_level}</p>
                    <p><strong>当前状态:</strong> 
                      <Tag color={selectedProject.status === '进行中' ? 'blue' : 'green'}>
                        {selectedProject.status}
                      </Tag>
                    </p>
                  </>
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card title="文件统计">
                <p>总文件数: {files.length}</p>
                <p>图片文件: {files.filter(f => ['jpg','png','gif'].includes(f.file_type)).length}</p>
                <p>文档文件: {files.filter(f => ['pdf','doc','docx'].includes(f.file_type)).length}</p>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="系统状态">
                <p>存储位置: 本地路径</p>
                <p>自动保存: 已启用</p>
                <p>最后同步: 刚刚</p>
              </Card>
            </Col>
          </Row>
          
          <Card
            title="过程文件管理"
            extra={
              <span>共 {files.length} 个文件</span>
            }
          >
            <Table
              columns={columns}
              dataSource={files}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Content>
      </Layout>

      {/* 文件预览模态框 */}
      <Modal
        title="文件预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80%"
        style={{ top: 20 }}
      >
        {previewFile && (
          <div style={{ height: '70vh', overflow: 'auto' }}>
            {previewFile.preview?.type === 'image' ? (
              <img
                src={previewFile.preview.data}
                alt={previewFile.file_name}
                style={{ maxWidth: '100%' }}
              />
            ) : previewFile.preview?.type === 'text' ? (
              <pre style={{ 
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                whiteSpace: 'pre-wrap'
              }}>
                {previewFile.preview.data}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p>此文件类型不支持在线预览</p>
                <Button
                  type="primary"
                  onClick={() => ipcRenderer.invoke('open-file', previewFile.file_path)}
                >
                  使用默认程序打开
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Dashboard;