var samsung = require('./index');

/**
2 = Folder to be package
3 = Folder that the server will run (Optional) Default:./packages
4 = App ID (Optional)
5 = App Tile (Optional)
6 = Port that the server will run (Optional) Default:80
**/

samsung.run(process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6]);