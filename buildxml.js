process.argv.forEach(function (val, index, array) {
//  console.log(index + ': ' + val);
});

//console.log(process.argv[2])

//to use
//node buildxml.js appID appTitle appDescription serverRootDirectory archiveName
 
var appID, appTitle, appDescription, serverRootDirectory, archiveName;
appID = process.argv[2];
appTitle=process.argv[3];
appDescription=process.argv[4];
serverRootDirectory=process.argv[5];
archiveName=process.argv[6];




var builder = require('xmlbuilder');
var doc = builder.create();
var stringlib=require('string');
var fs = require('fs');
var mkdirp=require('mkdirp');
var mv=require('mv')

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
		.ele('description').txt(appDescription)
			.up()
		.ele('download',serverRootDirectory+'/Widget/'+archiveName)

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

fs.mkdir('Widget')
mv('widgetlist.xml','Widget/widgetlist.xml',function(err){
console.log(err)
})
