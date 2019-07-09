const browserSyncFactory = require('browser-sync')
const history = require('connect-history-api-fallback')
const babel = require("@babel/core")
const fs = require('fs')

const browserSync = browserSyncFactory.create()

browserSync.watch('app/**/*').on("change", browserSync.reload)
browserSync.watch('.tmp/**/*').on("change", browserSync.reload)
browserSync.watch('views/*.jsx', function (event, file) {
    const {code, map} = babel.transformFileSync(file)
    fs.writeFileSync('.tmp/js/'+file.replace('.jsx','.js'), code+"/n"+map)
})

browserSync.init({
    notify: false,
    server: {
        baseDir: ['.tmp', 'app'],
        routes: {
            '/web_modules': 'web_modules'
        }
    },
    middleware: [history()]
})
