#!/usr/bin/env bash
# Install the tools that @moritzbrantner/maps needs to build itself during `bun install`,
# then run the given command (normally `bun install --frozen-lockfile`) with them on PATH.
#
# maps is consumed as a commit-pinned git dependency. Its `prepare` script builds the
# package, including its WASM runtime, so the install environment needs Rust 1.99.0 with
# the wasm32 target, wasm-bindgen 0.2.129 and wasm-opt (binaryen).
#
# Usage: bash scripts/with-maps-build-tools.sh bun install --frozen-lockfile
# In GitHub Actions the tool paths are also written to GITHUB_PATH for later steps.
set -euo pipefail

rust_toolchain=1.99.0
wasm_bindgen_version=0.2.129
binaryen_version=132

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)
    wasm_bindgen_target=x86_64-unknown-linux-musl
    wasm_bindgen_digest=82d12bb940e2d4e72e0d5605387fc1b8ca179044e012b620f0ce4e7440e8320e
    binaryen_target=x86_64-linux
    binaryen_digest=195ddc94f9bc89f45abdabb0b9eea86023d727ba90eac8b35b80f2544fc30572
    ;;
  Linux-aarch64)
    wasm_bindgen_target=aarch64-unknown-linux-musl
    wasm_bindgen_digest=2ed4351c35dd9440308bbb02767d47ea278efe851a52465300f3c94f5b6c2a87
    binaryen_target=aarch64-linux
    binaryen_digest=c58562417836c5d0493d89bdefc434933bdc097db641b483df86bcfa557a107f
    ;;
  *)
    echo "Unsupported host for maps build tools: $(uname -s)-$(uname -m)" >&2
    exit 1
    ;;
esac

if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error https://sh.rustup.rs |
    sh -s -- -y --profile minimal --default-toolchain none
  export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
fi
rustup toolchain install "$rust_toolchain" --profile minimal --target wasm32-unknown-unknown
export RUSTUP_TOOLCHAIN="$rust_toolchain"

tools_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/maps-build-tools"
download_dir="$(mktemp -d)"

fetch_checked() {
  local url="$1" digest="$2" archive="$3"
  curl --fail --location --silent --show-error --retry 3 "$url" --output "$archive"
  if ! printf '%s  %s\n' "$digest" "$archive" | sha256sum --check --status; then
    echo "Checksum mismatch for $url" >&2
    return 1
  fi
}

wasm_bindgen_name="wasm-bindgen-${wasm_bindgen_version}-${wasm_bindgen_target}"
fetch_checked \
  "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/${wasm_bindgen_version}/${wasm_bindgen_name}.tar.gz" \
  "$wasm_bindgen_digest" "$download_dir/wasm-bindgen.tar.gz"
tar -xzf "$download_dir/wasm-bindgen.tar.gz" -C "$download_dir"
mkdir -p "$tools_dir/bin"
install -m 0755 "$download_dir/$wasm_bindgen_name/wasm-bindgen" "$tools_dir/bin/wasm-bindgen"

fetch_checked \
  "https://github.com/WebAssembly/binaryen/releases/download/version_${binaryen_version}/binaryen-version_${binaryen_version}-${binaryen_target}.tar.gz" \
  "$binaryen_digest" "$download_dir/binaryen.tar.gz"
rm -rf "$tools_dir/binaryen"
mkdir -p "$tools_dir/binaryen"
tar -xzf "$download_dir/binaryen.tar.gz" -C "$tools_dir/binaryen" --strip-components=1
rm -rf "$download_dir"

export PATH="$tools_dir/bin:$tools_dir/binaryen/bin:$PATH"
if [[ -n "${GITHUB_PATH:-}" ]]; then
  printf '%s\n' "$tools_dir/bin" "$tools_dir/binaryen/bin" >>"$GITHUB_PATH"
fi
if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'RUSTUP_TOOLCHAIN=%s\n' "$rust_toolchain" >>"$GITHUB_ENV"
fi

wasm-bindgen --version
wasm-opt --version
cargo --version

if [[ $# -gt 0 ]]; then
  exec "$@"
fi
