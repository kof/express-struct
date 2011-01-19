test:
	qunit -c ./lib/mvc.js -t ./test/test.js --cov false

.PHONY: test