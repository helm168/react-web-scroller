var gulp = require('gulp');
var browserify = require('browserify');
var babel = require('babelify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var mergeStream = require('merge-stream');
var watch = require('gulp-watch');
var fs = require('fs');
var path = require('path');

function compileJs(entry, watch) {
    var bundler = watchify(browserify({entries: entry, extensions: ['.jsx', 'js'], global: true})
        .transform(babel.configure({
            presets: ['es2015', 'stage-0', 'react'],
            plugins: ['babel-plugin-add-module-exports']
        })));

    var appStream;

    function rebundle() {
        appStream = bundler.bundle()
          .once('error', function(err){console.log(err); this.emit('end');})
          .pipe(source(entry))
          .pipe(gulp.dest('./dist'));
    }

    if(watch) {
        bundler.on('update', function() {
            rebundle();
        });
    }

    rebundle();
}

gulp.task('test', function() {
    var demoPath = './demos';
    var folderPath, demoEntryPath, entries = [];
    fs.readdir(demoPath, function(err, files) {
        if (!err) {
            files.forEach(function(file) {
                folderPath = path.join(demoPath, file);
                if (fs.statSync(folderPath).isDirectory()) {
                    entries.push(path.join(folderPath, 'app.js'));
                }
            });
            entries.forEach(function(entry) {
                compileJs(entry, true);
            });
        } else {
            console.error('error happens when read ' + demoPath + '. msg: ' + err.message);
        }
    });
})

gulp.task('default', ['test']);
