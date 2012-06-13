test:
	node node_modules/qunit/bin/cli -c ./lib/mvc.js -t ./test/test.js

.PHONY: test lint
