const argv = require('yargs').argv
const fs = require('fs')

const overlayDir = '@es'
const indent = 4

function err (dsc) {
    throw new Error(dsc)
}

function indexTemplate (name = '') {
    name || err('Invalid name')
    return `import defaultExport from '${name}'
export * from '${name}'
export default defaultExport
`
}

function packageTemplate (name = '') {
    name || err('Invalid name')
    return JSON.stringify(
        {
            name: '@es/' + name,
            version: '1.0.0',
            description: '',
            license: 'UNLICENSED',
            module: 'index.js',
            dependencies: {
                [name]: '*'
            }
        },
        null,
        indent
    )
}

function updatePacakgeJson (name = '') {
    name || err('Invalid name')
    const pkgPath = 'package.json'
    const pkg = JSON.parse(fs.readFileSync(pkgPath))
    'webmodules' in pkg || (pkg.webmodules = {})
    'webDependencies' in pkg.webmodules || (pkg.webmodules.webDependencies = [])
    pkg.webmodules.webDependencies.includes(name) ||
        pkg.webmodules.webDependencies.push(name)
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, indent))
}

function makeOverlay (name = '', overwrite = false) {
    name || err('Invalid name')
    const pkgOverlayDir = overlayDir + '/' + name
    const pkgIndexPath = pkgOverlayDir + '/index.js'
    const pkgPackagePath = pkgOverlayDir + '/package.json'

    fs.existsSync(overlayDir) || fs.mkdirSync(overlayDir)
    fs.existsSync(pkgOverlayDir) || fs.mkdirSync(pkgOverlayDir)

    overwrite || !fs.existsSync(pkgIndexPath)
        ? fs.writeFileSync(pkgIndexPath, indexTemplate(name))
        : console.warn('Skip already present file generation: ' + pkgIndexPath)

    overwrite || !fs.existsSync(pkgPackagePath)
        ? fs.writeFileSync(pkgPackagePath, packageTemplate(name))
        : console.warn(
            'Skip already present file generation: ' + pkgPackagePath
        )
}

argv.pkg ||
    console.log(
        'Please specify package name with --pkg <pkg-name>\n' +
            'If you want to overwrite existing files add --force\n'
    )
argv.pkg && makeOverlay(argv.pkg, 'force' in argv)
