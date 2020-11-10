#!/bin/sh

# Allow the service to run without chamber (for CI, docker-compose, etc)
if [ -z "$NO_CHAMBER" ];then
  exec chamber exec fab-5-ops -- node dist/src/ops/server.js
else
  exec node dist/src/ops/server.js
fi;
