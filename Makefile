.PHONY: build unit integration benchmark-smoke test start

NPM ?= npm

build:
	$(NPM) run build

unit:
	$(NPM) run test:unit

integration:
	$(NPM) run test:integration

benchmark-smoke:
	$(NPM) run benchmark:smoke

test: build unit integration benchmark-smoke

start:
	$(NPM) run start
