#!/bin/bash
echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart ugc-studio

echo "Deployment complete!"
pm2 status
