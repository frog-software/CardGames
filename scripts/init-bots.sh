#!/bin/bash
# Initialize bot users for Four Color Card game testing
# Run this script to create bot user accounts that can be used for testing

echo "🤖 Initializing bot users for Four Color Card game..."

# Backend URL
BACKEND_URL="${1:-http://127.0.0.1:8090}"

echo "Using backend URL: $BACKEND_URL"

# Bot user credentials
BOT_USERS=(
    "bottest@example.com:bottest123:BotTest"
    "bot1@example.com:bot123456:Bot1"
    "bot2@example.com:bot123456:Bot2"
    "bot3@example.com:bot123456:Bot3"
)

# Function to create user
create_user() {
    local email=$1
    local password=$2
    local username=$3
    
    echo "Creating user: $email..."
    
    response=$(curl -s -X POST "$BACKEND_URL/api/collections/users/records" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"passwordConfirm\": \"$password\",
            \"username\": \"$username\",
            \"emailVisibility\": true
        }")
    
    if echo "$response" | grep -q '"id"'; then
        echo "✓ Created: $email"
        return 0
    elif echo "$response" | grep -q "Failed to create"; then
        echo "⚠ Already exists or error: $email"
        return 0
    else
        echo "✗ Failed: $email"
        echo "Response: $response"
        return 1
    fi
}

# Create all bot users
success_count=0
fail_count=0

for bot_config in "${BOT_USERS[@]}"; do
    IFS=':' read -r email password username <<< "$bot_config"
    if create_user "$email" "$password" "$username"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    echo ""
done

echo "===================="
echo "Summary:"
echo "✓ Successful: $success_count"
echo "✗ Failed: $fail_count"
echo "===================="

if [ $fail_count -eq 0 ]; then
    echo "✅ All bot users initialized successfully!"
    echo ""
    echo "You can now use the frontend to test the game:"
    echo "  - Bot test mode: http://localhost:8080/bot-test.html"
    echo "  - Human mode: http://localhost:8080/index.html"
    echo ""
    echo "Bot credentials:"
    for bot_config in "${BOT_USERS[@]}"; do
        IFS=':' read -r email password _ <<< "$bot_config"
        echo "  $email / $password"
    done
else
    echo "⚠ Some users failed to create. Please check the errors above."
    exit 1
fi
