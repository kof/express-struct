test:
	qunit -c ./lib/mvc.js -t ./test/test.js --cov false

lint:
	linter -f ./lib

.PHONY: test lint