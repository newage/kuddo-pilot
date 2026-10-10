#!/bin/bash
set -e
cd 'WORK_DIR_PLACEHOLDER'
exec claude --model sonnet --effort medium --print - < 'WORK_DIR_PLACEHOLDER/prompt.txt'
