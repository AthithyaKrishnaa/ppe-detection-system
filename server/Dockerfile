# Use a base image that has both Python and Node.js
FROM nikolaik/python-nodejs:python3.11-nodejs20

# Create and set the working directory
WORKDIR /app

# Install system dependencies for OpenCV and AI
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the server code
COPY . .

# Expose the port Express runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
