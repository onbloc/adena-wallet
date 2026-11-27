#!/bin/sh
# Runs a command with a local llama-server up: reuses one that is already
# running, otherwise starts one for the duration of the command.
#
#   PORT=8089 MODEL=bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M src/mock/cli/with-server.sh <command...>
set -eu

PORT="${PORT:-8089}"
MODEL="${MODEL:-bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M}"
LOG="${LOG:-/tmp/llama-server.log}"
url="http://127.0.0.1:$PORT"

if ! curl -sf "$url/health" >/dev/null; then
  echo "starting llama-server on :$PORT (first run downloads the model; log: $LOG)" >&2
  llama-server -hf "$MODEL" --jinja -c 8192 -np 1 --reasoning off --host 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 &
  pid=$!
  trap 'kill "$pid" 2>/dev/null || true' EXIT INT TERM

  waited=0
  until curl -sf "$url/health" >/dev/null; do
    kill -0 "$pid" 2>/dev/null || { echo "llama-server exited:" >&2; tail -20 "$LOG" >&2; exit 1; }
    [ "$waited" -lt 900 ] || { echo "timed out waiting for llama-server" >&2; exit 1; }
    sleep 2
    waited=$((waited + 2))
  done
fi

"$@"
