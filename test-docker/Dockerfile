FROM node:20

# Install dependencies
RUN apt-get update && apt-get install -y git bash && rm -rf /var/lib/apt/lists/*

# Create test user
RUN useradd -m testuser

# Set working directory
WORKDIR /app

# Copy package files (if they exist)
COPY package*.json ./

# Install claude-flow globally
RUN npm install -g claude-flow@latest || npm install -g claude-flow

# Switch to test user
USER testuser

# Create test script
RUN echo '#!/bin/bash\n\
echo "🐳 Docker claude-flow test starting..."\n\
echo ""\n\
echo "1. Testing init command..."\n\
claude-flow init\n\
echo ""\n\
echo "2. Testing memory store..."\n\
claude-flow memory store docker-test "Testing in Docker container"\n\
echo ""\n\
echo "3. Testing memory query..."\n\
claude-flow memory query docker-test\n\
echo ""\n\
echo "4. Checking persistence files..."\n\
find . -name "*.json" -o -name "*.db" | grep -E "(memory|swarm|persist)" || echo "No persistence files found"\n\
echo ""\n\
echo "5. Testing memory stats..."\n\
claude-flow memory stats\n\
echo ""\n\
echo "✅ Docker test complete!"' > /app/test.sh && chmod +x /app/test.sh

# Run tests
CMD ["/app/test.sh"]