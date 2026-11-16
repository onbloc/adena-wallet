.DEFAULT_GOAL := build
.PHONY: apps build build-all run test vet fmt lint install-host require-app

# Layout (mirrors onbloc/market-data-service):
#   apps/<app>   application code: cmd/<binary> plus app-private internal packages
#   pkg/         packages shared across apps
#
# build and run are app-scoped; select an app with APP=<name>.
APP ?= adena-mcp
APP_DIR = apps/$(APP)
BIN_DIR ?= bin
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS = -s -w -X main.version=$(VERSION)

require-app:
	@test -d "$(APP_DIR)" || { \
		echo "unknown app '$(APP)'; available: $$(ls apps)"; \
		exit 2; \
	}

apps:
	@ls apps

build: require-app
	go build -trimpath -ldflags "$(LDFLAGS)" -o $(BIN_DIR)/$(APP) ./$(APP_DIR)/cmd/$(APP)

build-all:
	@for app in $$(ls apps); do $(MAKE) --no-print-directory build APP=$$app || exit 1; done

run: require-app
	go run ./$(APP_DIR)/cmd/$(APP)

# Builds the host and registers it with the installed browsers.
install-host:
	$(MAKE) --no-print-directory build APP=adena-agent-host
	./$(BIN_DIR)/adena-agent-host install

test:
	go test -race ./...

vet:
	go vet ./...

fmt:
	gofumpt -w apps pkg

lint:
	golangci-lint run --config .golangci.yaml ./...
