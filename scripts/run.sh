#!/bin/sh

# Allow the service to run without chamber (for CI, docker-compose, etc)
if [ -z "$NO_CHAMBER" ];then
  exec chamber exec fab-5-engine -- node src/boot.js
else
  exec node src/boot.js
fi;
