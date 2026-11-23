.DEFAULT_GOAL := help
.PHONY: help init test eval chat deploy ios android

PORT   ?= 8089
RUNS   ?= 10
MODEL  ?= bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M
ARGS   ?=
PROMPT ?=

# Runs a command with llama-server up: reuses a running one, else starts and stops its own.
WITH_SERVER := PORT=$(PORT) MODEL=$(MODEL) scripts/with-server.sh
URL         := http://127.0.0.1:$(PORT)/v1

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
	$(WITH_SERVER) bun scripts/eval.ts --runs $(RUNS) --url $(URL) $(ARGS)

chat: ## Chat with the model in your own words (wallet assistant). Vars: PROMPT="..." asks once; ARGS="--plain" for the bare model
	$(WITH_SERVER) bun scripts/chat.ts --url $(URL) $(if $(PROMPT),--prompt "$$PROMPT") $(ARGS)

# `ios` / `android` are only arguments of `deploy`.
DEPLOY_PLATFORM := $(firstword $(filter ios android,$(MAKECMDGOALS)))

deploy: ## Release build + install on a connected phone: make deploy ios|android. Vars: DEVICE=<id> picks the phone
	@test -n "$(DEPLOY_PLATFORM)" || { echo "usage: make deploy ios|android" >&2; exit 1; }
	scripts/deploy.sh $(DEPLOY_PLATFORM)

ios android:
	@$(if $(filter deploy,$(MAKECMDGOALS)),:,echo "use: make deploy $@" >&2; exit 1)
