const browserSyncFactory = require('browser-sync')
const history = require('connect-history-api-fallback')

const browserSync = browserSyncFactory.create()

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
