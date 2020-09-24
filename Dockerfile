# Our internal Node base image that's automatically kept update to date with security patches
# https://github.com/segmentio/images/blob/master/segment/node
FROM 528451384384.dkr.ecr.us-west-2.amazonaws.com/segment-node:12.18

# Install packages required for compiling native bindings
RUN apk update && apk add make gcc g++ python

COPY ./ /fab-five-engine
WORKDIR /fab-five-engine

# Rebuild any native bindings that were copied over from Buildkite
RUN npm rebuild

# Bcrypt segfaults in alpine: https://github.com/kelektiv/node.bcrypt.js/issues/528
RUN npm rebuild bcrypt --build-from-source

# Use a multi stage build so that the packages required for
# compiling native bindings aren't in the final image
FROM 528451384384.dkr.ecr.us-west-2.amazonaws.com/segment-node:12.18

# Create unprivileged user to run as
RUN addgroup -g 1001 -S unprivilegeduser && adduser -u 1001 -S -G unprivilegeduser unprivilegeduser
USER unprivilegeduser

COPY --chown=unprivilegeduser --from=0 /fab-five-engine /fab-five-engine
WORKDIR /fab-five-engine

EXPOSE 3000
ENV PORT 3000

ENTRYPOINT ["scripts/run.sh"]
