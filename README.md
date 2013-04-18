samsung smart tv packager (2013)
by james b. pollack

this script will let you package a folder containing a html5 app without touching the samsung SDK.  

TO USE -- 

first:  
npm install 

then:
node samsungpackager.js APPID APPTITLE SERVERIP
---> i.e, node samsungpackager.js Gaiam006 GaiamTV 192.168.0.25

then manually move the contents of the packages folder to your web server root directory 
--->  i.e. move the Widget folder and widgetlist.xml file to your Apache folder (OSX native apache: /Library/WebServer/Documents or MAMP: /Applications/MAMP/htdocs)

ignore mkdir errors if the folders already exist -- if its not your first time packaging.  they don't break anything.

---------------------------------

best to structure your project to contain a couple of folders:

build --> (i just rename this repo) build scripts, node modules, packages it creates
src --> all of your working code