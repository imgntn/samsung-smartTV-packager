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

function saveUserConfFile(configPath, webosConf) {
    var userConfData = {};
    if (fs.existsSync(configPath)) {
        userConfData = JSON.parse(fs.readFileSync(configPath));
    }
    userConfData.webos = webosConf;
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

function getValidWebosConfData(configPath) {
    console.log(configPath);
    if (!(fs.existsSync(configPath))) {
        // userconf.json is not exists
        return null;
    }
    // userconf.json is already exists
    var userConfData = JSON.parse(fs.readFileSync(configPath));

    if (!(userConfData.hasOwnProperty('webos'))) {
        // userconf.json doesn't have webos data
        return null;
    }
    var webosData = userConfData.webos;
    if (typeof webosData.name !== 'string' || webosData.name.length <= 0) {
        // name is invalid
        return null;
    }
    if (typeof webosData.vendor !== 'string' || webosData.vendor.length <= 0) {
        // vendor is invalid
        return null;
    }
    if (typeof webosData.icon !== 'string' || webosData.icon.length <= 0) {
        // icon is invalid
        return null;
    }
    if (typeof webosData.largeicon !== 'string' || webosData.largeicon.length <= 0) {
        // largeicon is invalid
        return null;
    }
    if (!validateWebosVersion(webosData.version)) {
        // version is invalid
        return null;
    }

    return webosData;
}

function validateWebosVersion(version) {
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
    console.log('      > id          : ' + userData.id);
    console.log('      > name        : ' + userData.name);
    console.log('      > version     : ' + userData.version);
    console.log('      > vendor      : ' + userData.vendor);
    console.log('      > resolution  : ' + userData.resolution);

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
                return /\d.\d.\d/.test(input) ? true : 'invalid version string for webos platform';
            }
        }];
        inquirer.prompt(ask).then(function(answers) {
            callback(answers);
        });
    }
    else {
        ask = [{
            type: 'input',
            name: 'id',
            message: 'What\'s the application\'s id? (Valid format: DNS naming)',
            default: 'com.yourdomain.app',
            validate: function(input) {
                return /^([a-z0-9]+\.)+[a-z0-9]+$/.test(input) ? true : 'invalid id for webos platform';
            }
        },{
            type: 'input',
            name: 'name',
            message: 'What\'s the application\'s name?',
            default: cordovaConf.name,
            validate: function(input) {
                return /^[a-zA-Z0-9]+$/.test(input) ? true : 'invalid name for webos platform';
            }
        },  {
            type: 'input',
            name: 'version',
            message: 'Application Version (Valid RegExp: /\d./\d./\d/)',
            default: cordovaConf.version,
            validate: function(input) {
                return /\d.\d.\d/.test(input) ? true : 'invalid version string for webos platform';
            }
        }, {
            type: 'input',
            name: 'vendor',
            message: 'vendor (default is \'My Company\')',
            default: 'My Company',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid vendor';
            }
        },{
            type: 'input',
            name: 'icon',
            message: 'Icon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'largeicon',
            message: 'LargeIcon path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid iconpath';
            }
        }, {
            type: 'input',
            name: 'bgimage',
            message: 'Background image path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid path';
            }
        }, {
            type: 'input',
            name: 'splashbackground',
            message: 'Splash screen background path (default is \'img/logo.png\')',
            default: 'img/logo.png',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid path';
            }
        }, {
            type: 'input',
            name: 'bgcolor',
            message: 'Background color for app',
            default: 'white',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid color';
            }
        }, {
            type: 'input',
            name: 'iconcolor',
            message: 'Icon color for app',
            default: 'white',
            validate: function(input) {
                return typeof(input) === 'string' ? true : 'invalid color';
            }
        }, {
            type: 'list',
            name: 'resolution',
            message: 'Which resolution does your application developed for?',
            default: '1920x1080',
            choices: [
                '1280x720',
                '1920x1080'
            ]
        }];
        inquirer.prompt(ask).then(function(answers) {
            callback(answers);
        });
    }
}

function prepareDir(dir) {
    mkdirp.sync(dir);
}

function getManualWebosConfData(platformsData){
    var i,
        manualWebosConfData = null;

    if (platformsData) {
        for (i=0; i < platformsData.length; i++) {
            if (platformsData[i].$.name === 'tv-webos') {
                delete platformsData[i].$;
                manualWebosConfData = utils.trim(platformsData[i]._);
            }
        }
    }
    return manualWebosConfData;
}

module.exports = {
    prepare: function(successCallback, errorCallback, platformName, data) {
        console.log('\nStart preparing codes for Webos TV Platform......');

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
        var userData = getValidWebosConfData(userConfPath);

        if(userData) {
            // exist userconf for webos
            confirmUseExistingData(userData, function (useExisting) {
                if(useExisting) {
                    // if user select useExisting: Y
                    askUserData(cordovaConf, function (data) {
                        userData.version = data.version;
                        userData.manualConfData = getManualWebosConfData(cordovaConf.platform);
                        buildProject();
                    }, true, userData);
                }
                else {
                    // if user select useExisting: N
                    askUserData(cordovaConf, function (data) {
                        userData = data;
                        userData.manualConfData = getManualWebosConfData(cordovaConf.platform);
                        buildProject();
                    });
                }
            });
        }
        else {
            // not exist userconf for webos
            askUserData(cordovaConf, function (data) {
                userData = data;
                userData.manualConfData = getManualWebosConfData(cordovaConf.platform);
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

            console.log('\nPlease note below.');
            console.log('1. On WebOS, recommended maximum icon size is 80x80.');
            if(target.match(/(<meta.*)(http-equiv)(.*=*.)("Content-Security-Policy"|'Content-Security-Policy')/)) {
                console.log('2. Remove the meta tag for csp setting in [index.html]');
                console.log('   It is not supported on this platform. It would be caused abnormal operation.');
                console.log('   Please check your file : ' + targetFile);
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

                    if(fileName.match(/\.json.tmpl$/)) {
                        var renderedJSON = JSON.parse(rendered);
                        var manualConfDataJSON = JSON.parse(userData.manualConfData);

                        var key;
                        for(key in manualConfDataJSON) {
                            if(manualConfDataJSON.hasOwnProperty(key)) {
                                renderedJSON[key] =  manualConfDataJSON[key];
                            }
                        }
                        rendered = JSON.stringify(renderedJSON, '', '\t');
                    }

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
        console.log('\nStart packaging Webos TV Platform......');
        var www = data.www || path.join('platforms', 'tv-webos', 'www');
        var dest = data.dest || path.join('platforms', 'tv-webos', 'build');

        www = path.resolve(www);
        dest = path.resolve(dest);
        child.exec('ares --version', function(err, stdout, stderr) {
            if(err) {
                console.log(stderr);
                throw Error('The command \"ares\" failed. Make sure you have the latest Webos SDK installed, and the \"ares\" command (inside the CLI folder) is added to your path.');
            }
            console.log(stdout);

            // reference url : http://developer.lge.com/webOSTV/sdk/web-sdk/webos-tv-cli/using-webos-tv-cli/
            var result = shelljs.exec('ares-package ' + path.resolve(www));
            if(result.code) {
                throw Error(result.output);
            }
            else {
                var packagePath = result.output.match(/Creating package (.*) in/);
                if(packagePath && packagePath[1]) {
                    prepareDir(dest);
                    shelljs.mv('-f', packagePath[1], path.resolve(dest));
                    console.log('Package created at ' + path.join(dest, packagePath[1]));
                }
                else {
                    throw Error('Fail to retrieve Package File Location.');
                }
            }
        });
    },
    deploy: function (successCallback, errorCallback, data) {   // WebOS CLI
        console.log('\nStart deploying WebOS Smart TV Platform apps......');

        var { spawn } = require('child_process');
        var ipkPath = data.ipkPath || './platform/webos/build/app.ipk';
        var device = data.device || 'emulator';

        var userConfPath = path.join('platforms', 'userconf.json');

        var projectName = 'package';

        if(fs.existsSync(userConfPath)){
            var userData = JSON.parse(fs.readFileSync(userConfPath));

            if(userData.hasOwnProperty('webos')){
                projectName = userData.webos.name;
            }
        }
        else {
            grunt.log.error('Prepare and Build the project first.');
        }
        
        var proc = spawn('ares-install', ['--device', device, ipkPath]);

        proc.stdout.on('data', d => grunt.log.write(d.toString()));
        proc.stderr.on('data', d => grunt.log.error(d.toString()));
        proc.on('close', code => {
            if (code === 0) {
                grunt.log.ok('WebOS app deployed successfully.');
                successCallback && successCallback();
            } else {
                grunt.log.error('WebOS app deployment failed.');
                errorCallback && errorCallback();
            }
        });
    }
};
