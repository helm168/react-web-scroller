const gulp = require('gulp');
const browserify = require('browserify');
const babel = require('babelify');
const watchify = require('watchify');
const source = require('vinyl-source-stream');
const fs = require('fs');
const path = require('path');

function compileJs(entry, watch) {
  const bundler = watchify(browserify({ entries: entry, extensions: ['.jsx', 'js'], global: true })
    .transform(babel.configure({
      presets: ['es2015', 'stage-0', 'react'],
      plugins: ['babel-plugin-add-module-exports']
    })));

  function rebundle() {
    bundler.bundle()
      .once('error', function (err) { console.log(err); this.emit('end'); })
      .pipe(source(entry))
      .pipe(gulp.dest('./dist'));
  }

  if (watch) {
    bundler.on('update', () => {
      rebundle();
    });
  }

  rebundle();
}

gulp.task('test', () => {
  const demoPath = './demos';
  let folderPath;
  const entries = [];
  fs.readdir(demoPath, (err, files) => {
    if (!err) {
      files.forEach((file) => {
        folderPath = path.join(demoPath, file);
        if (fs.statSync(folderPath).isDirectory()) {
          entries.push(path.join(folderPath, 'app.js'));
        }
      });
      entries.forEach((entry) => {
        compileJs(entry, true);
      });
    } else {
      console.error(`error happens when read ${demoPath}. msg: ${err.message}`);
    }
  });
});

gulp.task('default', ['test']);
