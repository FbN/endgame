# ENDGAME

No transpilation during frontend development experiment

[Article about this project on Medium](https://medium.com/@ftaioli/bye-bye-transpile-3e4413f7f590?source=friends_link&sk=37ee211bc55f822685873e8185b2e276)

# SCRIPTS

## overlay
Use it to generate a package ES module overlay (package.json and index.js files).
The package files will be placed in 'es' folder.

Ex:
```
$ yarn run overlay --pkg react
```

## web-modules
Transpile overlayed dependencies declared in package.json "webmodules" attribute.
Generated dependencies will be placed in web_modules folder.

Ex:
```
$ yarn yarn run web-modules
```

## jsx
Transpile JSX to JS files. The output files will be placed inside ./tmp folder. The .tmp folder is added to browser sync roots to make files available to browser as they are inside app root.
Ex:
```
$ yarn run jsx
```

## serve
Start a browser sync server to make your project available. Ideal for developing. A couple of watches tasks listen for modification to source files and reload the browser window on change.

# AUTHOR
Fabiano Taioli

[fbn.github.io](http://fbn.github.io/)
