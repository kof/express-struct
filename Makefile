test:
	node node_modules/qunit/bin/cli -c ./lib/struct.js -t ./test/test.js

.PHONY: test lint
