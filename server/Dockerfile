FROM node:20-alpine

# Install FFmpeg and FFprobe (essential for video processing/transcoding)
RUN apk update && apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install dependencies (only production)
RUN npm ci --only=production

# Copy application source code
COPY . .

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV FFMPEG_PATH=/usr/bin/ffmpeg

# Expose ports:
# 5000: Express API server & Socket.io connections
# 1935: RTMP port for incoming OBS broadcasts
# 8000: HTTP port for Node Media Server (HLS/FLV streams)
EXPOSE 5000 1935 8000

# Start server using start script
CMD ["npm", "start"]
