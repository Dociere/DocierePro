#!/bin/bash
set -e

BINARY="./build/sidecar"
LIBS_DIR="./build/libs"

mkdir -p "$LIBS_DIR"

ldd "$BINARY" \
  | grep "=> /" \
  | awk '{print $3}' \
  | while read -r lib; do
      echo "Bundling: $lib"
      cp -L "$lib" "$LIBS_DIR/"
    done

echo "Done. Bundled libs:"
ls -lh "$LIBS_DIR/"