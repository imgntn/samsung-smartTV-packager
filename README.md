samsung smart tv packager (2013)
by james b. pollack

this script will let you package a folder containing a html5 app without touching the samsung SDK.  

TO USE -- 

first:  
npm install 

then:

node samsungpackager.js folderToArchive APPID APPTITLE SERVERIP logFolderToDelete

*the logs folder parameters is optional

---> i.e, node samsungpackager.js ../src GTV GTV 192.168.0.25 ../src/logs
*all paths relative to samsungpackager.js

then manually move the contents of the packages folder to your web server root directory 

--->  i.e. move the Widget folder and widgetlist.xml file to your Apache folder 
(OSX native apache: /Library/WebServer/Documents or MAMP: /Applications/MAMP/htdocs)

*hoping to make this programmatic but its kind of hard for the node app to get to certain system files security-wise, as far as i know

---------------------------------

best to structure your project to contain a couple of folders:

build --> (i just rename this repo) build scripts, node modules, packages it creates
src --> all of your working code
