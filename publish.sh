babel ./components/scroller.js -o ./dist/scroller.js && \
babel ./components/indicator.js -o ./dist/indicator.js && \
babel ./components/translate.js -o ./dist/translate.js && \
babel ./components/ease.js  -o ./dist/ease.js

npm publish
