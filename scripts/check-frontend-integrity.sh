#!/usr/bin/env bash
set -euo pipefail

fail=0
required=(
  index.html
  app.js
  stripe.js
  merchant-profile-v2.js
  merchant-directory.js
  dashboard-overview.js
  order-management.js
  shop-builder.js
  merchant-automation.js
  rebelkultur-command-center.js
  rebelkultur-discovery.js
  shop-navigation.js
)

for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required frontend file: $file"
    fail=1
  fi
done

if [[ -f index.html ]]; then
  for src in "app.js" "stripe.js" "merchant-directory.js" "rebelkultur-discovery.js" "shop-navigation.js"; do
    count=$(grep -o "src=\"[^\"]*${src}[^\"]*\"" index.html | wc -l | tr -d ' ')
    if [[ "$count" != "1" ]]; then
      echo "Expected exactly one script reference for $src, found $count"
      fail=1
    fi
  done

  if grep -q "merchant-profile.js" index.html; then
    echo "Obsolete merchant-profile.js is still referenced"
    fail=1
  fi
  if grep -q "merchant-orders-repair.js" index.html; then
    echo "Obsolete merchant-orders-repair.js is still referenced"
    fail=1
  fi
  if grep -q "security-patch.js" index.html; then
    echo "Obsolete security-patch.js is still referenced"
    fail=1
  fi
  if grep -q "stripe-payments.js" index.html; then
    echo "Obsolete stripe-payments.js is still referenced"
    fail=1
  fi
fi

if (( fail != 0 )); then
  exit 1
fi

echo "Frontend integrity checks passed."
