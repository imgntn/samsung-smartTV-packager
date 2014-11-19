#Samsung SmartTv Packager (2013)
@imgntn & @raphaelluchini 

This script will let you package a folder containing a html5 app and a run a webserver, without touching the samsung SDK.

##Getting Started

``npm install``

Runing as a Cli
===
``sudo node cli folderToArchive``

Runing as a node package
===
```
var samsungPackager = module('samsungstv-packager');
samsungPackager.run('your/app/folder');
```


The app will be served at localhost:80, just boot up your TV, point it at the correct IP address and sync your app.
