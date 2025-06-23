#!/bin/bash

echo "🔥 Fixing Google Cloud Firewall Rules"
echo "====================================="

# Get the current project and zone
PROJECT_ID=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
ZONE=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/zone" -H "Metadata-Flavor: Google" | cut -d/ -f4)
INSTANCE_NAME=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/name" -H "Metadata-Flavor: Google")

echo "Project ID: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Instance: $INSTANCE_NAME"
echo ""

# Check if gcloud is available and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Installing..."
    curl https://sdk.cloud.google.com | bash
    exec -l $SHELL
    gcloud init
fi

# Authenticate with service account if available
if [ -f /etc/google-cloud-service-account.json ]; then
    echo "🔐 Authenticating with service account..."
    gcloud auth activate-service-account --key-file=/etc/google-cloud-service-account.json
fi

# Set the project
gcloud config set project $PROJECT_ID

echo "🔍 Current firewall rules:"
gcloud compute firewall-rules list --filter="direction:INGRESS AND allowed.ports:(80 OR 443)" --format="table(name,allowed[].map().firewall_rule().list():label=ALLOW,sourceRanges.list():label=SRC_RANGES)"

echo ""
echo "🔧 Creating/updating firewall rules..."

# Create HTTP rule
echo "Creating HTTP rule..."
gcloud compute firewall-rules create allow-http-80 \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server \
    --description="Allow HTTP traffic on port 80" \
    --quiet || echo "HTTP rule already exists or failed to create"

# Create HTTPS rule  
echo "Creating HTTPS rule..."
gcloud compute firewall-rules create allow-https-443 \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=https-server \
    --description="Allow HTTPS traffic on port 443" \
    --quiet || echo "HTTPS rule already exists or failed to create"

echo ""
echo "🏷️  Adding network tags to instance..."
gcloud compute instances add-tags $INSTANCE_NAME \
    --zone=$ZONE \
    --tags=http-server,https-server \
    --quiet

echo ""
echo "✅ Firewall rules updated!"
echo ""
echo "🧪 Testing connectivity..."
echo "Waiting 30 seconds for rules to propagate..."
sleep 30

# Test from the instance itself
echo "Testing local HTTP connectivity..."
curl -I http://localhost --connect-timeout 5 || echo "Local HTTP test failed"

echo ""
echo "🌐 External connectivity should now work!"
echo "You can test from your local machine:"
echo "  curl -I http://youmeyou.ai"
echo "  curl -I https://youmeyou.ai (once SSL is configured)"
echo "" 