#!/bin/bash
cd /home/kavia/workspace/code-generation/laser-puzzle-challenge-179068-179078/light_weaver_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

