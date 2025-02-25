#!/bin/bash

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
npx pnpm install --no-frozen-lockfile

# Build the Nuxt application
echo "Building the Nuxt application..."
npx pnpm run build

# Output success message
echo "Build completed successfully!" 