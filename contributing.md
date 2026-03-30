# Note: The Contributing.md file is currently under development so expect rough edges

# Setting up Server

- `npm install`
- [Build Sidecar](#to-build-sidecar)

### To Build Sidecar

```
mkdir -p sidecar/build && cd sidecar/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
```
