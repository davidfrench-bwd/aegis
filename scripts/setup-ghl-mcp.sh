#!/bin/bash
# Setup GHL MCP connection

echo "Setting up GoHighLevel MCP connection..."

# Check if mcporter is installed
if ! command -v mcporter &> /dev/null; then
    echo "❌ mcporter not found. Please install it first."
    exit 1
fi

# Create config directory
mkdir -p ~/.openclaw/workspace/config

# Create mcporter config for GHL
cat > ~/.openclaw/workspace/config/mcporter.json << 'EOF'
{
  "mcpServers": {
    "gohighlevel": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gohighlevel"],
      "env": {
        "GOHIGHLEVEL_API_KEY": "${GHL_API_KEY}"
      }
    }
  }
}
EOF

echo "✅ Created mcporter config"
echo ""
echo "Next steps:"
echo "1. Add your GHL API key to .env.local:"
echo "   GHL_API_KEY=your-api-key-here"
echo ""
echo "2. Test the connection:"
echo "   mcporter list"
echo "   mcporter call gohighlevel.list_contacts locationId=iDDjqboB8jXHhSypXEvH"
echo ""