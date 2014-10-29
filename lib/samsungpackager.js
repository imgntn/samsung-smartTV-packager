var mv = require('mv');
var fs = require('fs-extra');
var os = require('os');
var express = require("express");
var zip = require("adm-zip");
var builder = require('xmlbuilder');
var stringlib = require('string');
var childProcess = require('child_process');
var Q = require('q');

var getNetworkIp = function(){
  var ifaces = os.networkInterfaces();
  var out = null;
  ifaces.en0.forEach(function(details){
    if (details.family=='IPv4') {
      out = details.address;
    }
  });
  return out;
};

var deleteFolders = function(serverFolder) {
  var deferred = Q.defer();
  console.log('Clean folders');
  fs.remove(serverFolder, function(err){
    if (err) deferred.reject(err);
    deferred.resolve();
  });
  return deferred.promise;
};

var makeZip = function(serverFolder, folderToArchive){
  var deferred = Q.defer();
  if(!folderToArchive){
    deferred.reject(new Error('Missing folder path to archive'));
  }
  console.log('Creating zip file');
  var zipName = 'samsungpackage.zip';
  var myZip = new zip();
  myZip.addLocalFolder(folderToArchive);
  myZip.writeZip('samsungpackage.zip');
  fs.move('samsungpackage.zip', serverFolder + '/Widget/samsungpackage.zip', function(err){
    if (err) deferred.reject(err);
    fs.chmod(serverFolder, 0777); //Prevent sudo permissions to delete the folder
    deferred.resolve();
    console.log('Zip has been created');
  });
  return deferred.promise;
};

var createXML = function(serverFolder, appId, appTitle){
  var deferred = Q.defer();
  var xmlFileName = "widgetlist.xml";
  var doc = builder.create();
  doc.begin('root')
    .ele('?xml')
      .att('version', '1.0').att('encoding','UTF-8')
      .up()
    .ele('rsp').att('stat','ok')
      .ele('list')
   .ele('widget').att('id',appId)
     .ele('title').txt(appTitle)
       .up()
     .ele('compression').att('size','12345').att('type','zip')
       .up()
     .ele('description').txt('My Samsung Application -- Description')
       .up()
     .ele('download','http://' + getNetworkIp() + '/Widget/samsungpackage.zip');
  
  var x = doc.toString();
  x = stringlib(x).stripTags('root');
  console.log('Creating XML file');
  fs.writeFile(xmlFileName, x.s, function(err) {
    if(err) deferred.reject(err);
    fs.move('widgetlist.xml', serverFolder + '/widgetlist.xml',function(err){
      if(err) deferred.reject(err);
      console.log("XML has been saved!");
      deferred.resolve();
    });
  });
    
  return deferred.promise;
};

var startServer = function(serverFolder, port){
  var app = express();

  app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });

  
  app.use(express.static(serverFolder));
  app.listen(port);

  console.log('Please go to http://' + getNetworkIp() + ' to test your popcorntime server.');
};


exports.run = function(folderToArchive, serverFolder, appID, appTitle, port){
  var deferred = Q.defer();
  var _folderToArchive = folderToArchive,
  _serverFolder = serverFolder || 'packages',
  _appID = appID || 'app',
  _appTitle = appTitle || 'Custom App',
  _port =  port || 80;

  Q.allSettled([
    deleteFolders(_serverFolder),
    makeZip(_serverFolder, _folderToArchive),
    createXML(_serverFolder, _appID, _appTitle),
  ]).spread(function(){
    startServer(_serverFolder, _port);
    deferred.resolve();
  });
  return deferred.promise;
};