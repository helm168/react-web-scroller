babel ./components/scroller.jsx -o ./dist/scroller.js
babel ./components/indicator.jsx -o ./dist/indicator.js
babel ./components/lock-manager.js -o ./dist/lock-manager.js
babel ./components/translate.js -o ./dist/translate.js
babel ./components/ease.js  -o ./dist/ease.js

npm publish
