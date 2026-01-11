/*
 * Copyright 2015 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var inquirer = require('inquirer');
var utils = require('../lib/utils');
var shelljs = require('shelljs');
var mustache = require('mustache');
var grunt = require('grunt');
var zipdir = require('zip-dir');
var xml2js = require('xml2js');
var os = require('os');
var express = require('express');

var revLen = 3;

function saveUserConfFile(configPath, orsayConf) {
    var userConfData = {};
    if (fs.existsSync(configPath)) {
        userConfData = JSON.parse(fs.readFileSync(configPath));
    }
    userConfData.orsay = orsayConf;
    fs.writeFileSync(configPath, JSON.stringify(userConfData, null, 2), {
        encoding: 'utf8'
    });
}

function getNextVersion(curver){
    var tmp = curver.split('.');
    var nextVersion = '';
    if(tmp.length == 2){
        // orsay version
        var major = tmp[0];
        var minor = tmp[1];
        var minorLen = minor.length;

        var minorInt = parseInt(minor) + 1;
        var minorStr = minorInt.toString();
        var minorStrLen = minorStr.length;

        if(minorLen < minorStrLen){
            var majorInt = parseInt(major) + 1;
            var majorStr = majorInt.toString();
            return majorStr + '.' + '00000';
        }
        var makeZero = minorLen - minorStrLen;
        var zeroStr = '';
        while(makeZero--){
            zeroStr += '0';
        }
        nextVersion = zeroStr + minorStr;
        return major + '.' + nextVersion;
    }else if(tmp.length == 3){
        //semantic version
        var majorsem = tmp[0];
        var minorsem = tmp[1];
        var revision = tmp[2];

        var revisionInt = parseInt(revision) + 1;
        var revisionStr = revisionInt.toString();
        var revisionStrLen = revisionStr.length;

        if(revision.length < revisionStrLen){
            var minorsemInt = parseInt(minorsem) + 1;
            var minorsemStr = minorsemInt.toString();
            return majorsem + '.' + minorsemStr + '.' + '0';
        }

        var beforeZero = revision.length - revisionStrLen;
        var zerosemStr = '';
        while(beforeZero--){
            zerosemStr += '0';
        }
        nextVersion = zerosemStr + revisionStr;
        return semVer2OrsayVer(majorsem + '.' + minorsem + '.' + nextVersion);
    }
}

function getValidOrsayConfData(configPath) {
    console.log(configPath);
    if (!(fs.existsSync(configPath))) {
        // userconf.json is not exists
        return null;
    }
    // userconf.json is already exists
    var userConfData = JSON.parse(fs.readFileSync(configPath));

    if (!(userConfData.hasOwnProperty('orsay'))) {
        // userconf.json doesn't have orsay data
        return null;
    }
    var orsayData = userConfData.orsay;
    if (typeof orsayData.name !== 'string' || orsayData.name.length <= 0) {
        // name is invalid
        return null;
    }
    if (typeof orsayData.thumbicon !== 'string' || orsayData.thumbicon.length <= 0) {
        // thumbicon is invalid
        return null;
    }
    if (typeof orsayData.bigthumbicon !== 'string' || orsayData.bigthumbicon.length <= 0) {
        // bigthumbicon is invalid
        return null;
    }
    if (typeof orsayData.listicon !== 'string' || orsayData.listicon.length <= 0) {
        // listicon is invalid
        return null;
    }
    if (typeof orsayData.biglisticon !== 'string' || orsayData.biglisticon.length <= 0) {
        // biglisticon is invalid
        return null;
    }
    if (!validateOrsayVersion(orsayData.version)) {
        // version is invalid
        return null;
    }
    // description is not mendatory

    return orsayData;
}

function validateOrsayVersion(version) {
    var tmp = version.split('.'),
        i;
    if (tmp.length !== 2) {
        return false;
    }
    for (i = 0; i < tmp.length; i++) {
        if (isNaN(tmp[i])) {
            return false;
        }
    }

    return i === tmp.length;
}

function semVer2OrsayVer(semver) {
    var LEN_MINOR = 2;
    var LEN_REV = 3;

    var tmp = semver.split('.');

    if(tmp.length < 3){
        return semver;
    }

    var major = tmp[0];
    var minor = tmp[1];
    var rev = tmp[2];

    minor = '000000' + tmp[1];
    rev = '000000' + tmp[2];

    minor = tmp[1].length > LEN_MINOR ? tmp[1] : minor.substr(Math.max(minor.length-LEN_MINOR,LEN_MINOR));
    rev = tmp[2].length > LEN_REV ? tmp[2] : rev.substr(Math.max(rev.length-LEN_REV,LEN_REV));

    revLen = rev.length;

    return major + '.' + minor + rev;
}

function confirmUseExistingData(userData, callback) {
    console.log('');
    console.log('      > [ Stored Information ]');
    console.log('      > name        : ' + userData.name);
    console.log('      > resolution  : ' + userData.resolution);
    console.log('      > category    : ' + userData.category);
    console.log('      > version     : ' + userData.version);
    console.log('      > description : ' + userData.description);

    var ask = [{
        type: 'confirm',
        name: 'useExisting',
        message: 'Already have \'userconf.json\', Do you want to use this data?'
    }];

    inquirer.prompt(ask).then(function(answers) {
        callback(!!answers.useExisting);
    });
}

function askUserData(cordovaConf, callback, versionOnly, userData) {
    var ask;
    if(versionOnly) {
        var curVer = userData.version;
        var updateVer = getNextVersion(userData.version);
        ask = [{
            type: 'input',
            name: 'version',
            message: 'current version is '+curVer+ '. Application version: ',
            default: updateVer,
            validate: function(input) {
                return /^[0-9]+\.[0-9]+$/.test(input) ? true : 'invalid version string for orsay platform';
            }
        }];
        inquirer.prompt(ask).then(function(answers) {
            callback(answers);
        });
    }
    else {
        ask = [{
            type: 'input',
            name: 'name',
            message: 'What\'s the application\'s name?',
            default: cordovaConf.name,
            validate: function(input) {
                return /^[a-zA-Z][^~!\.\;\\\/\|\"\'@\#$%<>^&*\()\-=+_\’\n\t\s]*$/.test(input) ? true : 'invalid name for orsay platform';
            }
        }, {
            type: 'list',
            name: 'resolution',
            message: 'Which resolution does your application developed for?',
            default: '960x540',
            choices: [
                '960x540',
                '1280x720',
                '1920x1080'
            ]
        }, {
            type: 'list',
            name: 'category',
            message: 'What\'s the application\'s category?',
            choices: [
                'VOD', 'sports', 'game', 'lifestyle', 'information', 'education'
            ]
        }, {
            type: 'input',
            name: 'version',
            message: 'Application Version(Valid RegExp: ^[0-9]+\.[0-9]+$)',
            default: semVer2OrsayVer(cordovaConf.version),
            validate: function(input) {
                return /^[0-9]+\.[0-9]+$/.test(input) ? true : 'invalid version string for orsay platform';
            }
        }, {
            type: 'input',
            name: 'thumbicon',
            message: 'ThumbIcon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'bigthumbicon',
            message: 'BigThumbIcon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'listicon',
            message: 'ListIcon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'biglisticon',
            message: 'BigListIcon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'description',
            message: 'Application Description',
            default: utils.trim(cordovaConf.description)
        }, {
            type: 'input',
            name: 'authorName',
            message: 'Author\'s name',
            default: cordovaConf.authorName
        }, {
            type: 'input',
            name: 'authorEmail',
            message: 'Author\'s email',
            default: cordovaConf.authorEmail
        }, {
            type: 'input',
            name: 'authorHref',
            message: 'Author\'s IRI(href)',
            default: cordovaConf.authorHref
        }];
        inquirer.prompt(ask).then(function(answers) {
            var config = answers;

            var tmp = config.resolution.split('x');
            config.resWidth = parseInt(tmp[0], 10);
            config.resHeight = parseInt(tmp[1], 10);
            answers = config;

            callback(answers);
        });
    }
}

function prepareDir(dir) {
    mkdirp.sync(dir);
}

function getManualOrsayConfData(platformsData) {
    var manualOrsayConfData = null;
    var builder = new xml2js.Builder({
        headless: true,
        renderOpts: { pretty: false }
    });

    if (platformsData) {
        for (var i = 0; i < platformsData.length; i++) {
            if (platformsData[i].$.name === 'sectv-orsay') {
                delete platformsData[i].$;
                var xml = builder.buildObject(platformsData[i]);
                manualOrsayConfData = utils.trim(xml);
            }
        }
    }
    return manualOrsayConfData;
}

module.exports = {
    prepare: function (successCallback, errorCallback, platformName, data) {
        console.log('\nStart preparing codes for Legacy Samsung Smart TV Platform......');

        // destination folder to paste necessary files for toast project
        var dest = data.dest || path.join('platforms', platformName, 'www');
        dest = path.resolve(dest);

        // target repository
        var platformRepos = data.platformRepos || ('../cordova-' + platformName);
        platformRepos = path.resolve(platformRepos);

        // original source
        var wwwSrc = path.resolve('www');

        // necessary files for toast project
        var scripts = data.scripts;

        // get data from cordova config.xml
        var cordovaConf = utils.getCordovaConfig();

        // get data from userconf.json
        var userConfPath = path.join('platforms', 'userconf.json');
        var userData = getValidOrsayConfData(userConfPath);

        if(userData) {
            // exist userconf for orsay
            confirmUseExistingData(userData, function (useExisting) {
                if(useExisting) {
                    // if user select useExisting: Y
                    askUserData(cordovaConf, function (data) {
                        userData.version = data.version;
                        userData.manualConfData = getManualOrsayConfData(cordovaConf.platform);
                        buildProject();
                    }, true, userData);
                }
                else {
                    // if user select useExisting: N
                    askUserData(cordovaConf, function (data) {
                        userData = data;
                        userData.manualConfData = getManualOrsayConfData(cordovaConf.platform);
                        buildProject();
                    });
                }
            });
        }
        else {
            // not exist userconf for orsay
            askUserData(cordovaConf, function (data) {
                userData = data;
                userData.manualConfData = getManualOrsayConfData(cordovaConf.platform);
                buildProject();
            });
        }

        function buildProject() {
            copySrcToDest() || (errorCallback && errorCallback());
            buildPlatformAdditions() || (errorCallback && errorCallback());
            replaceTemplates() || (errorCallback && errorCallback());
            console.log('Prepared at ' + dest);

            // warning for existing meta tag for csp setting
            var targetFile = path.join(wwwSrc, 'index.html');
            var target = fs.readFileSync(targetFile, {
                encoding: 'utf8'
            });

            if(target.match(/(<meta.*)(http-equiv)(.*=*.)("Content-Security-Policy"|'Content-Security-Policy')/)) {
                console.log('\nWARNING!!!!! REMOVE meta tag for csp setting in the "index.html"');
                console.log('It is not supported in this platform. It would be caused abnormal operation.');
                console.log('Please confirm your file : ' + targetFile);
            }

            saveUserConfFile(userConfPath, userData);
            successCallback && successCallback();
        }

        function copySrcToDest() {
            prepareDir(dest);

            for (var key in scripts) {
                if (scripts.hasOwnProperty(key)) {
                    var to = path.join(dest, key);
                    var from = path.resolve(scripts[key]);
                    shelljs.cp('-f', from, to);

                    if (!fs.existsSync(from)) {
                        throw Error('cordova.js, toast.js file are not exist.');
                    }
                }
            }

            shelljs.cp('-rf', path.join(wwwSrc, '*'), dest);

            if(cordovaConf.contentSrc !== 'index.html') {
                if(fs.existsSync(path.join(dest, 'index.html'))) {
                    grunt.log.error('Initial content, which is pointed by \'content\' tag in the \'config.xml\'), is not \'index.html\', but another \'index.html\' is already exist in the source!');
                    return false;
                }
                shelljs.mv(path.join(dest, cordovaConf.contentSrc), path.join(dest, 'index.html'));
            }

            return true;
        }

        function buildPlatformAdditions() {
            shelljs.cp('-rf', path.join(platformRepos, 'www', '*'), dest);
            // hack: copying hidden files(starts with dot) at root('www') to the dest directory.
            // if the dest is not exist, we can copy the platform files without this hack by using this command: cp -rf <PLATFORMREPOS>/www <destDir>
            // But the dest directory has the application files at this moment. So we need to use this hack.
            shelljs.cp('-rf', path.join(platformRepos, 'www', '.*'), dest);
            return true;
        }

        function replaceTemplates() {
            var files = fs.readdirSync(dest);
            for(var i=0; i<files.length; i++) {
                var fileName = files[i];
                if(fileName.match(/\.tmpl$/)) {
                    var tmplFilePath = path.join(dest, fileName);
                    var destFilePath = path.join(dest, fileName.replace(/\.tmpl$/, ''));
                    var template = fs.readFileSync(tmplFilePath, {
                        encoding: 'utf8'
                    });
                    var rendered = mustache.render(template, userData);
                    fs.writeFileSync(destFilePath, rendered, {
                        encoding: 'utf8'
                    });
                    shelljs.rm(path.join(dest, fileName));
                }
            }
            return true;
        }
    },
    build: function (successCallback, errorCallback, data){
        console.log('\nStart packaging Legacy Samsung Smart TV Platform......');
        var www = data.www || path.join('platforms', 'sectv-orsay', 'www');
        var dest = data.dest || path.join('platforms', 'sectv-orsay', 'build');

        www = path.resolve(www);
        dest = path.resolve(dest);

        var userConfPath = path.join('platforms', 'userconf.json');

        var projectName = 'package';

        if(fs.existsSync(userConfPath)){
            var userData = JSON.parse(fs.readFileSync(userConfPath));

            if(userData.hasOwnProperty('orsay')){
                projectName = userData.orsay.name;
            }
        }
        else {
            grunt.log.error('Prepare the project first.');
        }

        fs.mkdir(dest, function(){
            zipdir(www, {saveTo: path.join(dest, projectName + '.zip')}, function(){
                console.log('Package created at ' + path.join(dest, projectName));
                successCallback && successCallback();
            });
        });
    },
    deploy: function (successCallback, errorCallback, data) {  // HTTP host server + widgetlist.xml
        console.log('\nStart deploying Legacy Samsung Smart TV Platform apps......');
        var dest = data.dest || path.join('platforms', 'sectv-orsay', 'build');
        dest = path.resolve(dest);
        var serverRoot = data.serverRoot || '../serverRoot';
        serverRoot = path.resolve(serverRoot)
        var port = data.port || 80;

        var userConfPath = path.join('platforms', 'userconf.json');

        var projectName = 'package';

        if(fs.existsSync(userConfPath)){
            var userData = JSON.parse(fs.readFileSync(userConfPath));

            if(userData.hasOwnProperty('orsay')){
                projectName = userData.orsay.name;
            }
        }
        else {
            grunt.log.error('Prepare and Build the project first.');
        }
        
        var appId = data.id || projectName;
        var zipName = data.zipName || projectName + '.zip';

        arrangeFolders(serverRoot, function (err) {
            if (err) {
                grunt.log.error(err);
                errorCallback && errorCallback(err);
                return;
            }

            updateWidgetList(serverRoot, function (err) {
                if (err) {
                    grunt.log.error(err);
                    errorCallback && errorCallback(err);
                    return;
                }

                startServer(serverRoot, port);
                grunt.log.ok(`Host Server started at ${serverRoot}`);
                successCallback && successCallback();
            });
        });

        function getNetworkIp() {
            var interfaces = os.networkInterfaces();
            for (var name of Object.keys(interfaces)) {
                for (var intf of interfaces[name]) {
                    if (intf.family === 'IPv4' && !intf.internal) {
                        return intf.address;
                    }
                }
            }
            return '127.0.0.1';
        }

        function arrangeFolders(serverRoot, cb) {
            fs.mkdir(path.join(serverRoot, 'Widget'), { recursive: true }, function (err) {
                if (err) return cb(err);

                var srcZip = path.join(dest, zipName);
                var destZip = path.join(serverRoot, 'Widget', zipName);

                fs.copyFile(srcZip, destZip, function (err) {
                    if (err) return cb(err);
                    grunt.log.ok(`Copied ${zipName} to ${destZip}`);
                    cb(null);
                });
            });
        }

        function updateWidgetList(serverRoot, cb) {
            var xmlPath = path.resolve(path.join(serverRoot, 'widgetlist.xml'));
            var builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });

            if (fs.existsSync(xmlPath)) {
                var existing = fs.readFileSync(xmlPath, 'utf8');
                var parser = new xml2js.Parser({ explicitArray: false });

                parser.parseString(existing, (err, obj) => {
                    if (err) return cb(err);

                    if (!obj.rsp) obj.rsp = { $: { stat: 'ok' }, list: { widget: [] } };
                    if (!obj.rsp.list) obj.rsp.list = { widget: [] };
                    if (!Array.isArray(obj.rsp.list.widget)) {
                        obj.rsp.list.widget = obj.rsp.list.widget ? [obj.rsp.list.widget] : [];
                    }

                    obj.rsp.list.widget.push({
                        $: { id: appId },
                        title: projectName,
                        compression: { $: { size: '12345', type: 'zip' } },
                        description: 'My Samsung Application -- Description',
                        download: `http://${getNetworkIp()}/Widget/${zipName}`
                    });

                    var xml = builder.buildObject(obj);
                    fs.writeFile(xmlPath, xml, err => {
                        if (err) return cb(err);
                        grunt.log.ok(`Updated manifest at ${xmlPath}`);
                        cb(null);
                    });
                });
            } else {
                var obj = {
                    rsp: {
                        $: { stat: 'ok' },
                        list: {
                            widget: [{
                                $: { id: appId },
                                title: projectName,
                                compression: { $: { size: '12345', type: 'zip' } },
                                description: 'My Samsung Application -- Description',
                                download: `http://${getNetworkIp()}/Widget/${zipName}`
                            }]
                        }
                    }
                };

                var xml = builder.buildObject(obj);
                fs.writeFile(xmlPath, xml, err => {
                    if (err) return cb(err);
                    grunt.log.ok(`Created new manifest at ${xmlPath}`);
                    cb(null);
                });
            }
        }

        function startServer(serverRoot, port) {
            var app = express();
            app.all('*', (req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'X-Requested-With');
                next();
            });
            app.use(express.static(serverRoot));
            app.listen(port, () => {
                grunt.log.ok(`Server root at ${serverRoot}/`);
                grunt.log.ok(`Server running at http://${getNetworkIp()}:${port}/`);
            });
        }
    }
};