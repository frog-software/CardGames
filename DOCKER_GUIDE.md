# Docker Deployment Guide / Docker 部署指南

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Quick Start

#### 1. Build and Run with Docker Compose

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

The application will be available at:
- API: http://localhost:8090
- Admin UI: http://localhost:8090/_/

#### 2. Build Docker Image Only

```bash
# Build image
docker build -t cardgames:latest .

# Run container
docker run -d \
  --name cardgames \
  -p 8090:8090 \
  -v cardgames-data:/app/pb_data \
  cardgames:latest

# View logs
docker logs -f cardgames

# Stop container
docker stop cardgames

# Remove container
docker rm cardgames
```

### Production Deployment

#### With Nginx Reverse Proxy

1. **Enable Nginx profile:**
```bash
docker-compose --profile production up -d
```

2. **Configure SSL (optional):**
   - Place SSL certificates in `./ssl/` directory
   - Uncomment SSL configuration in `nginx.conf`
   - Update `server_name` with your domain

3. **Access application:**
   - HTTP: http://your-domain.com
   - HTTPS: https://your-domain.com

#### Environment Variables

Create a `.env` file for production:

```bash
# Encryption key for sensitive data (32 characters)
PB_ENCRYPTION_ENV=your-32-character-encryption-key-here

# Data directory (inside container)
PB_DATA_DIR=/app/pb_data
```

### Data Persistence

Data is stored in Docker volumes:

```bash
# List volumes
docker volume ls

# Backup data
docker run --rm -v cardgames-data:/data -v $(pwd):/backup alpine tar czf /backup/cardgames-backup.tar.gz -C /data .

# Restore data
docker run --rm -v cardgames-data:/data -v $(pwd):/backup alpine tar xzf /backup/cardgames-backup.tar.gz -C /data
```

### Development Mode

Mount game logic files for live updates:

```yaml
# docker-compose.yml
services:
  cardgames:
    volumes:
      - ./game_logics:/app/game_logics:ro
```

Then rebuild when you change Go code:
```bash
docker-compose up -d --build
```

### Health Checks

The container includes health checks:

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:8090/api/health
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow logs
docker-compose logs -f

# View specific service
docker-compose logs -f cardgames

# Last 100 lines
docker-compose logs --tail=100
```

### Troubleshooting

#### Container won't start

```bash
# Check logs
docker-compose logs cardgames

# Check if port is in use
lsof -i :8090

# Rebuild image
docker-compose build --no-cache
docker-compose up -d
```

#### Database issues

```bash
# Enter container
docker exec -it cardgames sh

# Check data directory
ls -la /app/pb_data/

# Check database file
file /app/pb_data/data.db
```

#### Permission issues

```bash
# Fix permissions
docker-compose down
docker run --rm -v cardgames-data:/data alpine chown -R 1000:1000 /data
docker-compose up -d
```

### Scaling (Advanced)

For horizontal scaling, use external database:

1. Use PostgreSQL instead of SQLite
2. Configure load balancer
3. Enable session affinity for WebSocket connections
4. Use Redis for session storage

### Monitoring

Add monitoring with Prometheus and Grafana:

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

### Security Best Practices

1. **Use strong encryption key**
   - Generate: `openssl rand -hex 16`
   - Store securely, never commit to git

2. **Enable HTTPS in production**
   - Use Let's Encrypt for free SSL
   - Configure nginx SSL properly

3. **Restrict network access**
   - Use Docker networks
   - Configure firewall rules
   - Limit exposed ports

4. **Regular backups**
   - Automate database backups
   - Store backups offsite
   - Test restore procedures

5. **Update regularly**
   - Keep base images updated
   - Update dependencies
   - Monitor security advisories

---

<a name="chinese"></a>
## 中文

### 快速开始

#### 1. 使用 Docker Compose 构建和运行

```bash
# 构建并启动应用
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止应用
docker-compose down

# 停止并删除卷（警告：删除所有数据）
docker-compose down -v
```

应用将在以下地址可用：
- API: http://localhost:8090
- 管理界面: http://localhost:8090/_/

#### 2. 仅构建 Docker 镜像

```bash
# 构建镜像
docker build -t cardgames:latest .

# 运行容器
docker run -d \
  --name cardgames \
  -p 8090:8090 \
  -v cardgames-data:/app/pb_data \
  cardgames:latest

# 查看日志
docker logs -f cardgames

# 停止容器
docker stop cardgames

# 删除容器
docker rm cardgames
```

### 生产环境部署

#### 使用 Nginx 反向代理

1. **启用 Nginx 配置：**
```bash
docker-compose --profile production up -d
```

2. **配置 SSL（可选）：**
   - 将 SSL 证书放在 `./ssl/` 目录中
   - 在 `nginx.conf` 中取消注释 SSL 配置
   - 使用您的域名更新 `server_name`

3. **访问应用：**
   - HTTP: http://your-domain.com
   - HTTPS: https://your-domain.com

#### 环境变量

为生产环境创建 `.env` 文件：

```bash
# 敏感数据加密密钥（32 字符）
PB_ENCRYPTION_ENV=your-32-character-encryption-key-here

# 数据目录（容器内）
PB_DATA_DIR=/app/pb_data
```

### 数据持久化

数据存储在 Docker 卷中：

```bash
# 列出卷
docker volume ls

# 备份数据
docker run --rm -v cardgames-data:/data -v $(pwd):/backup alpine tar czf /backup/cardgames-backup.tar.gz -C /data .

# 恢复数据
docker run --rm -v cardgames-data:/data -v $(pwd):/backup alpine tar xzf /backup/cardgames-backup.tar.gz -C /data
```

### 开发模式

挂载游戏逻辑文件以实现实时更新：

```yaml
# docker-compose.yml
services:
  cardgames:
    volumes:
      - ./game_logics:/app/game_logics:ro
```

然后在更改 Go 代码时重新构建：
```bash
docker-compose up -d --build
```

### 健康检查

容器包含健康检查：

```bash
# 检查容器健康
docker ps

# 手动健康检查
curl http://localhost:8090/api/health
```

### 日志

```bash
# 查看所有日志
docker-compose logs

# 跟踪日志
docker-compose logs -f

# 查看特定服务
docker-compose logs -f cardgames

# 最后 100 行
docker-compose logs --tail=100
```

### 故障排除

#### 容器无法启动

```bash
# 检查日志
docker-compose logs cardgames

# 检查端口是否被占用
lsof -i :8090

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

#### 数据库问题

```bash
# 进入容器
docker exec -it cardgames sh

# 检查数据目录
ls -la /app/pb_data/

# 检查数据库文件
file /app/pb_data/data.db
```

#### 权限问题

```bash
# 修复权限
docker-compose down
docker run --rm -v cardgames-data:/data alpine chown -R 1000:1000 /data
docker-compose up -d
```

### 安全最佳实践

1. **使用强加密密钥**
   - 生成：`openssl rand -hex 16`
   - 安全存储，永远不要提交到 git

2. **在生产环境启用 HTTPS**
   - 使用 Let's Encrypt 获取免费 SSL
   - 正确配置 nginx SSL

3. **限制网络访问**
   - 使用 Docker 网络
   - 配置防火墙规则
   - 限制暴露的端口

4. **定期备份**
   - 自动化数据库备份
   - 将备份存储在异地
   - 测试恢复程序

5. **定期更新**
   - 保持基础镜像更新
   - 更新依赖项
   - 监控安全公告

### 常用命令

```bash
# 查看运行中的容器
docker-compose ps

# 重启服务
docker-compose restart cardgames

# 更新并重启
docker-compose pull
docker-compose up -d

# 清理未使用的资源
docker system prune -a

# 查看资源使用
docker stats
```
