SHELL := /bin/bash
export PATH := $(HOME)/.elan/bin:$(PATH)

.PHONY: install run build test test-http test-browser verify

install:
	bash scripts/install.sh

run:
	node server.mjs

build:
	lake build
	npm run build

test:
	node tests/integration.mjs

test-http:
	node tests/transport.mjs

test-browser:
	node tests/browser.mjs

verify:
	bash scripts/verify.sh
