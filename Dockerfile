# Use the official Node.js image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# build the .js
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# run the server
CMD ["npm", "run", "dev"]
