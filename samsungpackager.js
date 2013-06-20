//to use -- node samsungpackager.js pathToFolderToArchive APPID APPTITLE SERVERIP
//then move the contents of the packages folder to your web server root directory 
// i.e. move the Widget folder and widgetlist.xml file to your Apache folder (on OSX: /Library/WebServer/Documents    ; MAMP: /Applications/MAMP/htdocs)
//ignore mkdir errors if the folders already exist -- if its not your first time packaging.  they don't break anything.


var mv=require('mv');
var fs=require('fs');
var requestHandlers = require('./requesthandlers.js');
var server = require("./server");
var router = require("./route");

var zip = require("adm-zip");

var builder = require('xmlbuilder');
var stringlib=require('string');

var folderToArchive;
folderToArchive=process.argv[2];
var myZip = new zip();

deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

var deleteLogs=process.argv[6];
deleteFolderRecursive(deleteLogs);
deleteFolderRecursive('packages');

    fs.mkdir('packages',function (err) {
    if (err) console.error(err)


    else {
        fs.mkdir('packages/Widget',function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});
        console.log('pow!')
        makeZip();
    }
});

makeZip=function(){
    myZip.addLocalFolder(folderToArchive);
// i.e. ../src

        myZip.writeZip(/*target file name*/"samsungpackage.zip");
        console.log('end of FIRST FUNCTION');

        

        mv('samsungpackage.zip','packages/Widget/samsungpackage.zip',function(err){
if(err){console.log(err)}
    else{console.log('moved that')}
})
}



var appID, appTitle, serverIP;

appID = process.argv[3];
appTitle=process.argv[4];
serverIP=process.argv[5];




 var doc = builder.create();  	
doc.begin('root')
  .ele('?xml')
    .att('version', '1.0').att('encoding','UTF-8')
    .up()
  .ele('rsp').att('stat','ok')
    .ele('list')
	.ele('widget').att('id',appID)
		.ele('title').txt(appTitle)
			.up()
		.ele('compression').att('size','12345').att('type','zip')
			.up()
		.ele('description').txt('My Samsung Application -- Description')
			.up()
		.ele('download','http://'+serverIP+'/Widget/samsungpackage.zip')

console.log(doc.toString({ pretty: true }));
x = doc.toString()
x = stringlib(x).stripTags('root');
console.log(x.s)
output = x.s;
widgetListXML="widgetlist.xml"
fs.writeFile(widgetListXML, output, function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("The file was saved!");
    }
}); 
    
    mv('widgetlist.xml','packages/widgetlist.xml',function(err){
if(err){console.log(err)}
	else{console.log('moved that')}
})







var childProcess = require('child_process'),
     ls;

 ls = childProcess.exec('ls -l', function (error, stdout, stderr) {
   if (error) {
     console.log(error.stack);
     console.log('Error code: '+error.code);
     console.log('Signal received: '+error.signal);
   }
   console.log('Child Process STDOUT: '+stdout);
   console.log('Child Process STDERR: '+stderr);
 });

 ls.on('exit', function (code) {
   console.log('Child process exited with exit code '+code);
 });


var handle = {}
handle["Widget"] = requestHandlers.widget;
handle["widgetlist.xml"] = requestHandlers.widgetlist;


var port = 80;
server.start(router.route, handle, port);


