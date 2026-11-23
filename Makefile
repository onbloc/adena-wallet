.DEFAULT_GOAL := help
.PHONY: help init test eval

PORT  ?= 8089
RUNS  ?= 10
MODEL ?= bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M
ARGS  ?=

help: ## Show targets
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-6s %s\n", $$1, $$2}'

init: ## Install npm packages, plus bun and llama.cpp (brew) if missing
	npm install
	@command -v bun >/dev/null || brew install bun
	@command -v llama-server >/dev/null || brew install llama.cpp

test: ## Typecheck + lint + all jest tests (mock model, no LLM)
	npm run typecheck
	npm run lint
	npm test

eval: ## Run wallet scenarios on a real model via llama.cpp on this Mac. Vars: RUNS=10 ARGS="--scenario transfer --verbose"
	@set -e; \
	url=http://127.0.0.1:$(PORT); \
	if ! curl -sf $$url/health >/dev/null; then \
	  echo "starting llama-server on :$(PORT) (first run downloads the model; log: /tmp/llama-server.log)"; \
	  llama-server -hf $(MODEL) --jinja -c 4096 -np 1 --reasoning off --host 127.0.0.1 --port $(PORT) >/tmp/llama-server.log 2>&1 & \
	  pid=$$!; \
	  trap 'kill $$pid 2>/dev/null' EXIT; \
	  waited=0; \
	  until curl -sf $$url/health >/dev/null; do \
	    kill -0 $$pid 2>/dev/null || { echo "llama-server exited:"; tail -20 /tmp/llama-server.log; exit 1; }; \
	    [ $$waited -lt 900 ] || { echo "timed out waiting for llama-server"; exit 1; }; \
	    sleep 2; waited=$$((waited + 2)); \
	  done; \
	fi; \
	npm run eval -- --runs $(RUNS) --url $$url/v1 $(ARGS)
