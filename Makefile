GREEN=\033[32m
BLUE=\033[34m
RED=\033[31m
NC=\033[0m

.PHONY: build build-iife build-esm clean publish test

build: clean build-iife build-esm
	@echo "$(GREEN)Build complete!$(NC)"

build-iife:
	@echo "$(BLUE)Building IIFE (browser) bundle...$(NC)"
	# Build IIFE bundle with global name Stalker (minified)
	bun build src/index.js --outfile=dist/knowu.umd.js --format=iife --minify --globalName=Stalker

build-esm:
	@echo "$(BLUE)Building ESM bundle...$(NC)"
	# Build ESM bundle (minified)
	bun build src/index.js --outfile=dist/knowu.esm.js --format=esm --minify

clean:
	@echo "$(RED)Cleaning dist folder...$(NC)"
	@rm -rf dist
	@mkdir -p dist

publish: build
	@echo "$(BLUE)Publishing package via Bun...$(NC)"
	# Publish via Bun (ensure you are logged in)
	bun publish

dev:
	@echo "$(BLUE)Starting development build...$(NC)"
	bun run src/index.js

test:
	@echo "$(BLUE)Running Jest tests...$(NC)"
	@bunx jest
