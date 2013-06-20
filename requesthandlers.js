var fs = require('fs');

function widgetlist(response, notused, request) {
  console.log("Request handler 'widgetlist' was called");
  

//path to widgetlist.xml file
var content=fs.readFile('packages/widgetlist.xml','binary',function(err,res){console.log(res);
       var headers = {
          "Content-Type": "application/xml",
          "Content-Length": res.length
        };
     response.writeHead(200, headers);
    response.end(res);

});

   
      };




function widget(response, path) {
  console.log("Request handler 'widget' was called for " + path);

  
    var packagepath='packages/Widget/samsungpackage.zip'  //path to package zip;
    var widget = fs.readFile(packagepath, 'binary', function(err, data){

       var headers = {
      "Content-Type": "application/zip",
      "Content-Length": data.length // to avoid the "chunked data" response
    };

     response.writeHead(200, headers);
    response.end(data,'binary');
    
    });
   

   
  };



// function favicon(response) {
//   var img = fs.readFileSync('./favicon.ico');
//   response.writeHead(200, {"Content-Type": "image/x-icon"});
//   response.end(img,'binary');
// }

exports.widgetlist = widgetlist;
exports.widget = widget;
// exports.favicon = favicon;