#!/bin/bash

claude "quick test to see if claude code works. When complete display the extact message '<ALL-DONE>' in console summary to indicate compeletion" \
  --mcp-config .roo/mcp.json \
  --allowedTools "mcp__filesystem__read_file,mcp__github__create_pr,mcp__postgres__query" \
  --dangerously-skip-permissions \
  --verbose
