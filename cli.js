var samsung = require('./index');

/**
1 = Folder to be package
2 = Folder that the server will run (Optional) Default:./pakages
3 = App ID (Optional)
4 = App Tile (Optional)
5 = Port that the server will run (Optional) Default:80
**/

samsung.run(process.argv[1], process.argv[2], process.argv[3], process.argv[4], process.argv[5]);