# grunt-cordova-sectv deploy task

This JS task will let you deploy TOAST apps without the need of Samsung SDK.

This is a modified version of the original [samsung-smartTV-packager](https://github.com/imgntn/samsung-smartTV-packager) library made for the modern [Samsung TOAST](https://developer.samsung.com/smarttv/develop/extension-libraries/toast.html) smart TV app developement environment.

Changes:
- removed app packaging: already managed by [grunt-cordova-sectv](https://github.com/Samsung/grunt-cordova-sectv).
- Modernized codebase (async/await, fs/promises, xmlbuilder2, Express).
- Added support for [TOAST supported platforms](https://developer.samsung.com/smarttv/develop/extension-libraries/toast.html) (Orsay, Tizen, WebOS).

#### Objective
ease and improve compatibility with app deployment methods of all TOAST supported platforms:
- Orsay (Legacy) -> host on local webserver + widgetlist.xml, pull via legacy app-sync
- Tizen -> deploy via 'sdb install' (Smart Developement Bridge)
- WebOS -> deploy via 'ares-install' (WebOS CLI)

### Use
-   `sectv-deploy`: Deploys packaged (`.zip` or `.wgt`) Cordova apps to supported smart tv platforms through their relative deploy methods.

    -   Options for the task:

        ```js
        'sectv-deploy': {  // task
            'sectv-orsay': {    // target
                dest: 'platforms/sectv-orsay/build/',   // Path to use for host server root
                id: 'app',                              // Widget Identifier
                port: '80',                             // Port of the host server (default 80)
                zipName: 'app.zip'                          // Name of the packaged app archive
                /*
                    After the host server has started, boot up your TV in developer mode, point it at the correct IP address, and sync your apps.
                */
            },
            'sectv-tizen': {
                wgtPath: 'app.wgt',     // Path of the packaged widget
                /*
                    Deployment is performed via: 'sdb install <buildfolder>/<wgtName>'
                */
            },
            'tv-webos': {
                ipkPath: 'platform/webos/build/app.ipk',            // Path of the packaged app archive
                device: 'emulator',                                 // Target device name
                /*
                    Deployment is performed via: ares-install --device <device> <buildfolder>/<ipkName>
                */
            }
        }
        ```
