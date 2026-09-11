#!/usr/bin/env bash
set -euo pipefail

fail=0
while IFS= read -r file; do
  while IFS= read -r match; do
    line_no="${match%%:*}"
    line_text="${match#*:}"
    if [[ "$line_text" != *"security definer"* ]]; then
      continue
    fi
    start=$((line_no > 8 ? line_no - 8 : 1))
    end=$((line_no + 12))
    block=$(sed -n "${start},${end}p" "$file")
    if [[ "$block" != *"search_path"* ]]; then
      echo "SECURITY CHECK FAILED: $file:$line_no SECURITY DEFINER without nearby search_path"
      fail=1
    fi
  done < <(grep -in "security definer" "$file" || true)
done < <(find supabase/migrations -type f -name '*.sql' -print | sort)

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo 'Supabase SECURITY DEFINER checks passed.'
