#!/bin/bash

echo "🧪 Testing Auth Service via Gateway"
echo "=================================="

GATEWAY_URL="https://staging.youmeyou.ai"
# Fallback to IP if DNS not ready
GATEWAY_IP="http://34.93.209.77"

echo "1. Testing Gateway Health Check..."
curl -s "$GATEWAY_URL/health" || curl -s "$GATEWAY_IP/health"
echo -e "\n"

echo "2. Testing Auth Service Health..."
curl -s "$GATEWAY_URL/api/auth/status" || curl -s "$GATEWAY_IP/api/auth/status"
echo -e "\n"

echo "3. Testing Database Connection..."
curl -s "$GATEWAY_URL/api/auth/db-test" || curl -s "$GATEWAY_IP/api/auth/db-test"
echo -e "\n"

echo "4. Testing Login Endpoint..."
curl -s -X POST "$GATEWAY_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' || \
curl -s -X POST "$GATEWAY_IP/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
echo -e "\n"

echo "5. Testing Register Endpoint..."
curl -s -X POST "$GATEWAY_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"newpass","name":"Test User"}' || \
curl -s -X POST "$GATEWAY_IP/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"newpass","name":"Test User"}'
echo -e "\n"

echo "✅ Auth Service Test Complete!" 