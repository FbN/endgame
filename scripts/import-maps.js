const glob = require('glob')
const fs = require('fs')

const appDir = 'app'

function getHtmlFiles (root) {
    return new Promise(function (resolve, reject) {
        glob(root + '/**/*.html', {}, function (er, files) {
            er && reject(er)
            !er && resolve(files)
        })
    })
}

async function updateImportMaps (modules) {
    const fileList = await getHtmlFiles(appDir)
    const modNames = modules.map(module => ({
        overlay: module,
        real: module.replace(/[^\/]*\/(.*)\.js/g, (f, m) => m)
    }))
    return fileList
        .map(path => ({ path, content: fs.readFileSync(path, 'utf8') }))
        .map(html => {
            html.content = html.content.replace(
                /<script type="importmap">([^<]*)<\/script>/gm,
                function (all, group) {
                    const json = JSON.parse(group.trim() || '{}')
                    json.imports = json.imports || {}
                    modNames.forEach(m => {
                        json.imports[m.real] = '/web_modules/' + m.overlay
                    })
                    return (
                        '<script type="importmap">\n' +
                        JSON.stringify(json, null, 4) +
                        '\n</script>'
                    )
                }
            )
            return html
        })
        .map(html => fs.writeFileSync(html.path, html.content))
}

exports.updateImportMaps = updateImportMaps
