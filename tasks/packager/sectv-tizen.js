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
var child = require('child_process');
var js2xmlparser =  require('js2xmlparser');

function saveUserConfFile(configPath, tizenConf) {
    var userConfData = {};
    if (fs.existsSync(configPath)) {
        userConfData = JSON.parse(fs.readFileSync(configPath));
    }
    userConfData.tizen = tizenConf;
    fs.writeFileSync(configPath, JSON.stringify(userConfData, null, 2), {
        encoding: 'utf8'
    });
}

function getNextSemVersion(curver) {    // just increase revision
    var tmp = curver.split('.');
    var major = parseInt(tmp[0], 10);
    var minor = parseInt(tmp[1], 10);
    var revision = (parseInt(tmp[2], 10) || 0) + 1;

    return major + '.' + minor + '.' + revision;
}

function generateTizenPackageID() {
    return Math.random().toString(36).substr(2, 10);
}

function getValidTizenConfData(configPath) {
    console.log(configPath);
    if (!(fs.existsSync(configPath))) {
        // userconf.json is not exists
        return null;
    }
    // userconf.json is already exists
    var userConfData = JSON.parse(fs.readFileSync(configPath));

    if (!(userConfData.hasOwnProperty('tizen'))) {
        // userconf.json doesn't have tizen data
        return null;
    }
    var tizenData = userConfData.tizen;
    if (typeof tizenData.name !== 'string' || tizenData.name.length <= 0) {
        // name is invalid
        return null;
    }
    if (typeof tizenData.packageid !== 'string' || tizenData.packageid.length !== 10) {
        // packageid is invalid
        return null;
    }
    if (typeof tizenData.iconpath !== 'string' || tizenData.iconpath.length <= 0) {
        // iconpath is invalid
        return null;
    }
    if (!validateTizenVersion(tizenData.version)) {
        // version is invalid
        return null;
    }
    // description is not mendatory

    return tizenData;
}

function validateTizenVersion(version) {
    var tmp = version.split('.'),
        i;
    if (tmp.length !== 3) {
        return false;
    }
    for (i = 0; i < tmp.length; i++) {
        if (isNaN(tmp[i])) {
            return false;
        }
    }

    return i === tmp.length;
}

function confirmUseExistingData(userData, callback) {
    console.log('');
    console.log('      > [ Stored Information ]');
    console.log('      > name        : ' + userData.name);
    console.log('      > package ID  : ' + userData.packageid);
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
        var updateVer = getNextSemVersion(userData.version);
        ask = [{
            type: 'input',
            name: 'version',
            message: 'Current version is ' + curVer + '. Application version: ',
            default: updateVer,
            validate: function(input) {
                return /\d.\d.\d/.test(input) ? true : 'invalid version string for tizen platform';
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
                return /^[a-zA-Z][^~!\.\;\\\/\|\"\'@\#$%<>^&*\()\-=+_\’\n\t\s]*$/.test(input) ? true : 'invalid name for tizen platform';
            }
        }, {
            type: 'input',
            name: 'packageid',
            message: 'Package Id (Valid RegExp: [0-9a-zA-Z]{10})',
            default: generateTizenPackageID(),
            validate: function(input) {
                return /[0-9a-zA-Z]{10}/.test(input) ? true : 'invalid id string for tizen platform';
            }
        }, {
            type: 'input',
            name: 'version',
            message: 'Application Version (Valid RegExp: /\d./\d./\d)',
            default: cordovaConf.version,
            validate: function(input) {
                return /\d.\d.\d/.test(input) ? true : 'invalid version string for tizen platform';
            }
        }, {
            type: 'input',
            name: 'iconpath',
            message: 'Icon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'description',
            message: 'Application Description',
            default: utils.trim(cordovaConf.description)
        }];
        inquirer.prompt(ask).then(function(answers) {
            callback(answers);
        });
    }
}

function prepareDir(dir) {
    mkdirp.sync(dir);
}

function getManualTizenConfData(platformsData){
    var i,
        manualTizenConfData = null;
    if (platformsData) {
        for (i=0; i < platformsData.length; i++) {
            if (platformsData[i].$.name === 'sectv-tizen') {
                delete platformsData[i].$;
                manualTizenConfData = utils.trim(js2xmlparser('platform',platformsData[i],{declaration : {include : false},attributeString : '$'}).replace(/<(\/?platform)>/igm,''));
            }
        }
    }
    return manualTizenConfData;
}

module.exports = {
    prepare: function(successCallback, errorCallback, platformName, data) {
        console.log('\nStart preparing codes for Samsung Tizen Platform......');

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
        var userData = getValidTizenConfData(userConfPath);

        if(userData) {
            // exist userconf for tizen
            confirmUseExistingData(userData, function (useExisting) {
                if(useExisting) {
                    // if user select useExisting: Y
                    askUserData(cordovaConf, function (data) {
                        userData.version = data.version;
                        userData.manualConfData = getManualTizenConfData(cordovaConf.platform);
                        buildProject();
                    }, true, userData);
                }
                else {
                    // if user select useExisting: N
                    askUserData(cordovaConf, function (data) {
                        userData = data;
                        userData.manualConfData = getManualTizenConfData(cordovaConf.platform);
                        buildProject();
                    });
                }
            });
        }
        else {
            // not exist userconf for tizen
            askUserData(cordovaConf, function (data) {
                userData = data;
                userData.manualConfData = getManualTizenConfData(cordovaConf.platform);
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
                console.log('It would be caused abnormal operation. It is recommended to add csp setting in config.xml.');
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
    build: function(successCallback, errorCallback, data) {
        console.log('\nStart packaging Samsung Tizen TV Platform......');
        var www = data.www || path.join('platforms', 'sectv-tizen', 'www');
        var dest = data.dest || path.join('platforms', 'sectv-tizen', 'build');
        var TEMPORARY_BUILD_DIR = '.buildResult';

        www = path.resolve(www);
        dest = path.resolve(dest);
        child.exec('tizen version', function(err, stdout, stderr) {
            if(err) {
                console.log(stderr);
                throw Error('The command \"tizen\" failed. Make sure you have the latest Tizen SDK installed, and the \"tizen\" command (inside the tools/ide/bin folder) is added to your path.');
            }
            console.log(stdout);

            // reference url : https://developer.tizen.org/development/tools/web-tools/command-line-interface#mw_package
            var result = shelljs.exec('tizen cli-config "default.profiles.path=' + path.resolve(data.profilePath) + '"');
            if(result.code) {
                throw Error(result.output);
            }
            result = shelljs.exec('tizen build-web -out ' + TEMPORARY_BUILD_DIR + ' -- "' + path.resolve(www) + '"');
            if(result.code) {
                throw Error(result.output);
            }
            result = shelljs.exec('tizen package --type wgt --sign ' + data.profileName + ' -- ' + path.resolve(path.join(www, TEMPORARY_BUILD_DIR)));
            if(result.code) {
                throw Error(result.output);
            }
            else {
                var packagePath = result.output.match(/Package File Location\:\s*(.*)/);
                if(packagePath && packagePath[1]) {
                    prepareDir(dest);
                    shelljs.mv('-f', packagePath[1], path.resolve(dest));
                    shelljs.rm('-rf', path.resolve(path.join(www, TEMPORARY_BUILD_DIR)));
                    console.log('Package created at ' + path.join(dest, path.basename(packagePath[1])));
                }
                else {
                    throw Error('Fail to retrieve Package File Location.');
                }
            }
        });
    },
    deploy: function (successCallback, errorCallback, data) {   // Smart Developement Bridge
        console.log('\nStart deploying Tizen Samsung Smart TV Platform apps......');

        var { spawn } = require('child_process');
        var wgtPath = data.wgtPath || './platform/tizen/build/app.wgt';

        var userConfPath = path.join('platforms', 'userconf.json');

        var projectName = 'package';

        if(fs.existsSync(userConfPath)){
            var userData = JSON.parse(fs.readFileSync(userConfPath));

            if(userData.hasOwnProperty('tizen')){
                projectName = userData.tizen.name;
            }
        }
        else {
            grunt.log.error('Prepare and Build the project first.');
        }
        
        var proc = spawn('sdb', ['install', wgtPath]);

        proc.stdout.on('data', d => grunt.log.write(d.toString()));
        proc.stderr.on('data', d => grunt.log.error(d.toString()));
        proc.on('close', code => {
            if (code === 0) {
                grunt.log.ok('Tizen app deployed successfully.');
                successCallback && successCallback();
            } else {
                grunt.log.error('Tizen app deployment failed.');
                errorCallback && errorCallback();
            }
        });
    }
};
