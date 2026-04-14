#!/usr/bin/env bash
set -e

IMAGE="ghcr.io/iankulin/schedulae"
VERSION=$(node -p "require('./package.json').version")

MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)

echo "Building $IMAGE:$VERSION ..."
docker build \
  --platform linux/amd64 \
  -t "$IMAGE:$VERSION" \
  -t "$IMAGE:$MAJOR.$MINOR" \
  -t "$IMAGE:$MAJOR" \
  -t "$IMAGE:latest" \
  .

echo "Pushing tags..."
docker push "$IMAGE:$VERSION"
docker push "$IMAGE:$MAJOR.$MINOR"
docker push "$IMAGE:$MAJOR"
docker push "$IMAGE:latest"

echo "Done: $IMAGE tagged as $VERSION, $MAJOR.$MINOR, $MAJOR, latest"
