# Deployment Guide

This guide covers deploying the Soapy backend and frontend.

## Backend Deployment

### Prerequisites

- Node.js 20+ installed
- Git installed
- API keys for OpenAI and/or Anthropic (optional for stub mode)

### Environment Configuration

1. Copy the environment template:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` and configure:
```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0  # Use 0.0.0.0 for production to bind to all interfaces

# API Keys and Provider Configuration
# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: custom endpoint

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Ollama (local LLM server - optional)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2

# LM Studio (local LLM server - optional)
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# Generic OpenAI-compatible provider (optional)
OPENAI_COMPATIBLE_BASE_URL=https://your-provider.com/v1
OPENAI_COMPATIBLE_MODEL=your-model-name
OPENAI_COMPATIBLE_API_KEY=your-api-key

# Authentication
API_KEYS=your-secure-api-key-1,your-secure-api-key-2

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Git Storage
CONVERSATIONS_DIR=/var/soapy/conversations  # Use absolute path for production

# Streaming Configuration
STREAMING_TIMEOUT=300
MAX_CONCURRENT_STREAMS=10

# Git Optimization
GIT_CACHE_SIZE=1000
GIT_SHALLOW_CLONE=true

# Data Retention (days, 0 = infinite)
RETENTION_DAYS=0

# Logging
LOG_LEVEL=info  # Use 'warn' or 'error' in production
```

### Build and Deploy

#### Option 1: Node.js Directly

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run the server
npm start
```

The server will start on the configured PORT (default: 3000).

#### Option 2: PM2 (Recommended for Production)

```bash
cd backend

# Install PM2 globally (if not already installed)
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/index.js --name soapy-backend

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
```

PM2 provides:
- Automatic restarts on crashes
- Log management
- Process monitoring
- Zero-downtime reloads

#### Option 3: Docker

Create a `Dockerfile` in the backend directory:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist ./dist
COPY .env.example ./.env

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:

```bash
cd backend

# Build Docker image
docker build -t soapy-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  -v /var/soapy/conversations:/app/conversations \
  --env-file .env \
  --name soapy-backend \
  soapy-backend
```

### Health Check

Verify the deployment:

```bash
# Check WSDL
curl http://localhost:3000/soap?wsdl

# Check REST endpoint
curl http://localhost:3000/v1/chat/test/branding

# Run health check CLI
npm run health
```

Expected output:
- WSDL: Valid XML document with 8 operations
- REST: JSON response with branding data
- Health: All checks passing ✅

### Monitoring

The backend logs in JSON format to stderr:

```bash
# View logs with PM2
pm2 logs soapy-backend

# View logs with Docker
docker logs -f soapy-backend

# View logs directly
tail -f /path/to/logs/soapy.log
```

### Scaling

For high availability:

1. **Load Balancing**: Use nginx or HAProxy to distribute traffic
2. **Multiple Instances**: Run multiple backend instances with PM2 cluster mode:
   ```bash
   pm2 start dist/index.js -i max --name soapy-backend
   ```
3. **Git Storage**: Use NFS or distributed file system for shared conversations directory

## Frontend Deployment

### Build for Production

```bash
cd frontend

# Install dependencies
npm install

# Build static files
npm run build
```

This creates a `dist/` directory with optimized static files.

### Deployment Options

#### Option 1: Static File Server (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /soap {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /v1 {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: Vercel/Netlify

1. Connect your repository to Vercel or Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: `frontend`
3. Add environment variables for API endpoint
4. Deploy

#### Option 3: Docker

```dockerfile
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Reverse Proxy (Production)

Use nginx as reverse proxy for both frontend and backend:

```nginx
upstream soapy_backend {
    server localhost:3000;
    server localhost:3001;  # Add more backends for load balancing
}

server {
    listen 80;
    server_name soapy.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name soapy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        root /var/www/soapy/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location ~ ^/(soap|v1) {
        proxy_pass http://soapy_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for streaming
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

## Security Checklist

- [ ] Use strong API keys (at least 32 characters, random)
- [ ] Enable HTTPS/TLS in production
- [ ] Configure CORS appropriately (restrict origins)
- [ ] Set secure file permissions on .env file (chmod 600)
- [ ] Use firewall to restrict access to backend port
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Set up log rotation
- [ ] Enable rate limiting (via nginx or Fastify plugin)
- [ ] Validate all inputs (already done via TypeScript + Ajv)
- [ ] Set up monitoring and alerting

## Maintenance

### Updating

```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 reload soapy-backend

# Frontend
cd ../frontend
npm install
npm run build
# Copy new files to nginx directory
```

### Backup

Important directories to backup:
- `/var/soapy/conversations/` - All conversation data (Git repositories)
- `.env` - Environment configuration (keep secure!)

### Logs

Rotate logs to prevent disk space issues:

```bash
# /etc/logrotate.d/soapy
/var/log/soapy/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 soapy soapy
    sharedscripts
    postrotate
        pm2 reload soapy-backend > /dev/null
    endscript
}
```

## Troubleshooting

### Backend won't start
1. Check logs: `pm2 logs soapy-backend`
2. Verify environment variables: `npm run health`
3. Check port availability: `lsof -i :3000`
4. Verify dependencies: `npm list`

### Frontend can't connect to backend
1. Check CORS settings in `.env`
2. Verify proxy configuration in `vite.config.ts` or nginx
3. Test backend directly: `curl http://localhost:3000/soap?wsdl`

### SOAP requests failing
1. Verify WSDL is accessible: `curl http://localhost:3000/soap?wsdl`
2. Check Content-Type header: `text/xml`
3. Validate SOAP envelope XML format

### Performance issues
1. Check system resources: `top`, `free -h`, `df -h`
2. Monitor with PM2: `pm2 monit`
3. Review slow endpoints in logs
4. Consider scaling horizontally (more instances)

## Support

- Documentation: See README.md
- Issues: https://github.com/johnhenry/soapy/issues
- Health Check: `npm run health`
