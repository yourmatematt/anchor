#!/bin/bash

# Anchor Webhook Test Script
# Usage: ./test-webhook.sh [pattern_type] [webhook_url]
#
# Examples:
#   ./test-webhook.sh payday_loan http://localhost:3000/api/webhooks/up-bank
#   ./test-webhook.sh gambling_sportsbet https://your-domain.vercel.app/api/webhooks/up-bank
#   ./test-webhook.sh cash_withdrawal

PATTERN=$1
WEBHOOK_URL=${2:-"http://localhost:3000/api/webhooks/up-bank"}

if [ -z "$PATTERN" ]; then
  echo "Usage: ./test-webhook.sh [pattern_type] [webhook_url]"
  echo ""
  echo "Available patterns:"
  echo "  legitimate_whitelisted    - Normal bill payment (whitelisted)"
  echo "  payday_loan_beforepay     - CRITICAL: Payday loan from Beforepay"
  echo "  gambling_sportsbet        - CRITICAL: Sportsbet transaction"
  echo "  gambling_venue_late_night - CRITICAL: Pokies venue late at night"
  echo "  crypto_coinspot           - CRITICAL: Crypto exchange"
  echo "  cash_withdrawal_large     - HIGH: Large ATM withdrawal"
  echo "  suspicious_transfer_tuesday_night - HIGH: Transfer on Tuesday night"
  echo "  suspicious_transfer_late_night    - HIGH: Late night transfer"
  echo "  small_withdrawal_1        - Part 1 of multiple withdrawal pattern"
  echo "  small_withdrawal_2        - Part 2 of multiple withdrawal pattern"
  echo "  small_withdrawal_3        - Part 3 (triggers pattern)"
  echo "  suspicious_loan_keyword   - HIGH: Suspicious loan-like credit"
  echo ""
  echo "Webhook URL: $WEBHOOK_URL"
  exit 1
fi

echo "=== Testing Anchor Webhook ==="
echo "Pattern: $PATTERN"
echo "URL: $WEBHOOK_URL"
echo ""

# Extract the specific payload from test-payloads.json
PAYLOAD=$(cat test-payloads.json | jq ".${PATTERN}")

if [ "$PAYLOAD" == "null" ]; then
  echo "Error: Pattern '$PATTERN' not found in test-payloads.json"
  exit 1
fi

echo "Sending webhook request..."
echo ""

# Send the webhook request
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-up-authenticity-signature: test" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "=== Test Complete ==="
