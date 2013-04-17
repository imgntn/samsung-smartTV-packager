var express = require('express');
var app = new express();
app.listen(3000)

console.log(process.argv[2])
var folderToArchive = process.argv[2]

  var spawn = require('child_process').spawn;
    app.get('/scripts/archive', function(req, res) {
            // Options -r recursive -j ignore directory info - redirect to stdout
            var zip = spawn('zip', ['-r', '-', folderToArchive]);

            res.contentType('zip');

            // Keep writing stdout to res
            zip.stdout.on('data', function (data) {
                res.write(data);
            });

            zip.stderr.on('data', function (data) {
                // Uncomment to see the files being added
                console.log('zip stderr: ' + data);
            });

            // End the response on zip exit
            zip.on('exit', function (code) {
                if(code !== 0) {
                    res.statusCode = 500;
                    console.log('zip process exited with code ' + code);
                    res.end();
                } else {
                    res.end();
                }
            });
        });
