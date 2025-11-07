#!/bin/bash
# Simple test script to verify the setup

echo "=== CardGames Platform Test ==="
echo

# Check if binary exists
if [ ! -f "./cardgames" ]; then
    echo "❌ Build not found. Run: go build -o cardgames"
    exit 1
fi

echo "✅ Binary found"

# Check if it runs
if ./cardgames --help > /dev/null 2>&1; then
    echo "✅ Binary executes successfully"
else
    echo "❌ Binary failed to execute"
    exit 1
fi

# Clean and start server briefly
echo "🚀 Testing server initialization..."
rm -rf pb_data
timeout 3 ./cardgames serve --dev > /dev/null 2>&1 || true

# Check if database was created
if [ -f "pb_data/data.db" ]; then
    echo "✅ Database created"
else
    echo "❌ Database not created"
    exit 1
fi

# Check collections using sqlite3 if available
if command -v sqlite3 > /dev/null 2>&1; then
    echo
    echo "📋 Collections created:"
    sqlite3 pb_data/data.db "SELECT name FROM _collections WHERE system=0 ORDER BY name;" | while read col; do
        echo "   - $col"
    done
    
    echo
    echo "🎮 Game rules:"
    sqlite3 pb_data/data.db "SELECT name, description FROM game_rules;" | while IFS='|' read name desc; do
        echo "   - $name: ${desc:0:50}..."
    done
fi

echo
echo "✅ All tests passed!"
echo
echo "To start the server, run:"
echo "  ./cardgames serve"
echo
echo "Then visit: http://127.0.0.1:8090/_/"
