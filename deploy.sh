#!/bin/bash
set -e

echo "🏗️ Building Docker images..."
docker build -t bricked-lemons/backend:latest ./backend
docker build -t bricked-lemons/frontend:latest ./frontend
docker build --build-arg MONGO_VERSION=8.3.4 -t bricked-lemons/mongo-rs:latest -f ./mongodb_rs/Dockerfile ./mongodb_rs

# Define unique NodePorts for each namespace to prevent host collisions
declare -A FRONT_PORTS=( ["aws-simulation"]=30080 ["gcp-simulation"]=30082 )
declare -A BACK_PORTS=( ["aws-simulation"]=30081 ["gcp-simulation"]=30083 )

for NS in "aws-simulation" "gcp-simulation"; do
  F_PORT=${FRONT_PORTS[$NS]}
  B_PORT=${BACK_PORTS[$NS]}
  
  echo "=================================================="
  echo "🚀 Deploying to namespace: $NS"
  echo "📍 Frontend: http://localhost:$F_PORT"
  echo "📍 Backend API: http://localhost:$B_PORT"
  echo "=================================================="
  
  # 1. Create namespace
  kubectl create namespace $NS --dry-run=client -o yaml | kubectl apply -f -
  
  # 2. Load ConfigMaps from Namespace-Specific .env files
  if [ -f "./backend/.env.$NS" ]; then
    kubectl create configmap backend-env --from-env-file=./backend/.env.$NS -n $NS --dry-run=client -o yaml | kubectl apply -f -
  elif [ -f "./backend/.env" ]; then
    kubectl create configmap backend-env --from-env-file=./backend/.env -n $NS --dry-run=client -o yaml | kubectl apply -f -
  fi
  
  if [ -f "./frontend/.env.$NS" ]; then
    kubectl create configmap frontend-env --from-env-file=./frontend/.env.$NS -n $NS --dry-run=client -o yaml | kubectl apply -f -
  elif [ -f "./frontend/.env" ]; then
    kubectl create configmap frontend-env --from-env-file=./frontend/.env -n $NS --dry-run=client -o yaml | kubectl apply -f -
  fi
  
  # 3. Apply Databases
  kubectl apply -n $NS -f k8s/databases.yaml
  
  # 4. Apply Apps (Replacing NodePort placeholders)
  sed -e "s/{{FRONTEND_NODE_PORT}}/$F_PORT/g" -e "s/{{BACKEND_NODE_PORT}}/$B_PORT/g" k8s/apps.yaml | kubectl apply -n $NS -f -
  
done

echo "✅ Deployment complete!"