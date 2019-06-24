/**
 * Based on pikaweb
 * https://github.com/pikapkg/web
 * license: MIT
 */
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const chalk = require('chalk')
const ora = require('ora')
const yargs = require('yargs-parser')
const rollup = require('rollup')
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve')
const rollupPluginCommonjs = require('rollup-plugin-commonjs')
const { terser } = require('rollup-plugin-terser')
const rollupPluginReplace = require('rollup-plugin-replace')
const rollupPluginJson = require('rollup-plugin-json')
const isNodeBuiltin = require('is-builtin-module')
const spawn = require('child_process').spawn
const updateImportMaps = require('./import-maps.js').updateImportMaps

function fromEntries (iterable) {
    return [...iterable].reduce(
        (obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }),
        {}
    )
}

const cwd = process.cwd()

const detectionResults = []

let spinner = ora('transpiling')

let spinnerHasError = false

function formatDetectionResults (skipFailures) {
    return detectionResults
        .map(
            ([d, yn]) =>
                yn ? chalk.green(d) : skipFailures ? chalk.dim(d) : chalk.red(d)
        )
        .join(', ')
}
function logError (msg) {
    if (!spinnerHasError) {
        spinner.stopAndPersist({ symbol: chalk.cyan('⠼') })
    }
    spinnerHasError = true
    spinner = ora(chalk.red(msg))
    spinner.fail()
}
class ErrorWithHint extends Error {
    constructor (message, hint) {
        super(message)
        this.hint = hint
    }
}
function detectExports (filePath) {
    const fileLoc = path.join(cwd, filePath)
    try {
        if (fs.existsSync(fileLoc)) {
            return Object.keys(require(fileLoc)).filter(e => e[0] !== '_')
        }
    } catch (err) {
        console.log(err)
        // ignore
    }
}
/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency (dep) {
    const nodeModulesLoc = path.join(cwd, 'node_modules', dep)
    let dependencyStats
    try {
        dependencyStats = fs.statSync(nodeModulesLoc)
    } catch (err) {
        throw new ErrorWithHint(
            `"${dep}" not found in your node_modules directory.`,
            chalk.italic(`Did you remember to run npm install?`)
        )
    }
    if (dependencyStats.isFile()) {
        return nodeModulesLoc
    }
    if (dependencyStats.isDirectory()) {
        const dependencyManifestLoc = path.join(nodeModulesLoc, 'package.json')
        const manifest = require(dependencyManifestLoc)
        if (!manifest.module) {
            throw new ErrorWithHint(
                `dependency "${dep}" has no ES "module" entrypoint.`,
                chalk.italic(`Tip: Create an ES 'module' Overlay`)
            )
        }
        return path.join(nodeModulesLoc, manifest.module)
    }
    throw new Error(
        `Error loading "${dep}" at "${nodeModulesLoc}". (MODE=${
            dependencyStats.mode
        }) `
    )
}
/**
 * Formats the @pika/web dependency name from a "webDependencies" input value:
 * 2. Remove any ".js" extension (will be added automatically by Rollup)
 */
function getWebDependencyName (dep) {
    return dep.replace(/\.js$/, '')
}
async function install (
    arrayOfDeps,
    { destLoc, skipFailures, isOptimized, namedExports }
) {
    const knownNamedExports = Object.assign({}, namedExports)
    if (arrayOfDeps.length === 0) {
        logError('no dependencies found.')
        return
    }
    if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
        logError(
            'no "node_modules" directory exists. Did you run "npm install" first?'
        )
        return
    }
    const depObject = {}
    for (const dep of arrayOfDeps) {
        try {
            const depName = getWebDependencyName(dep)
            const depLoc = resolveWebDependency(dep)
            depObject[depName] = depLoc
            detectionResults.push([dep, true])
            spinner.text = formatDetectionResults(skipFailures)
        } catch (err) {
            detectionResults.push([dep, false])
            spinner.text = formatDetectionResults(skipFailures)
            if (skipFailures) {
                continue
            }
            // An error occurred! Log it.
            logError(err.message || err)
            if (err.hint) {
                console.log(err.hint)
            }
            return false
        }
    }
    if (Object.keys(depObject).length === 0) {
        logError(`No ESM dependencies found!`)
        console.log(
            chalk.dim(
                `  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${chalk.underline(
                    'https://www.pika.dev'
                )}`
            )
        )
        return false
    }
    const inputOptions = {
        input: depObject,
        plugins: [
            rollupPluginReplace({
                'process.env.NODE_ENV': isOptimized
                    ? '"production"'
                    : '"development"'
            }),
            rollupPluginNodeResolve({
                mainFields: ['browser', 'module', 'jsnext:main', 'main'].filter(
                    Boolean
                ),
                modulesOnly: false,
                extensions: ['.mjs', '.cjs', '.js', '.json'],
                preferBuiltins: false
            }),
            rollupPluginJson({
                preferConst: true,
                indent: '  '
            }),
            rollupPluginCommonjs({
                extensions: ['.js', '.cjs'],
                namedExports: knownNamedExports
            }),
            !!isOptimized && terser()
        ],
        onwarn: (warning, warn) => {
            if (warning.code === 'UNRESOLVED_IMPORT') {
                logError(
                    `'${warning.source}' is imported by '${
                        warning.importer
                    }', but could not be resolved.`
                )
                if (isNodeBuiltin(warning.source)) {
                    console.log(
                        chalk.dim(
                            `  '${
                                warning.source
                            }' is a Node.js builtin module that won't exist on the web. You can find modern, web-ready packages at ${chalk.underline(
                                'https://www.pika.dev'
                            )}`
                        )
                    )
                } else {
                    console.log(
                        chalk.dim(
                            `  Make sure that the package is installed and that the file exists.`
                        )
                    )
                }
                return
            }
            warn(warning)
        }
    }
    const outputOptions = {
        dir: destLoc,
        format: 'esm',
        sourcemap: true,
        exports: 'named',
        chunkFileNames: 'common/[name]-[hash].js'
    }
    const packageBundle = await rollup.rollup(inputOptions)
    const wr = await packageBundle.write(outputOptions)
    return wr.output
        .map(m => m.fileName)
        .filter(name => !name.startsWith('common'))
}

async function webModules (optimize = false, dest = 'web_modules') {
    const destLoc = path.join(cwd, dest)
    const pkgManifest = require(path.join(cwd, 'package.json'))
    const { namedExports, webDependencies } = pkgManifest['webmodules'] || {
        namedExports: undefined,
        webDependencies: undefined
    }
    const doesWhitelistExist = !!webDependencies
    const arrayOfDeps =
        webDependencies || Object.keys(pkgManifest.dependencies || {})
    spinner.start()
    const startTime = Date.now()
    console.log(arrayOfDeps)
    const result = await install(arrayOfDeps, {
        destLoc,
        namedExports,
        skipFailures: !doesWhitelistExist,
        isOptimized: optimize
    })
    if (result) {
        spinner.succeed(
            chalk.bold(`webmodules`) +
                ` installed: ` +
                formatDetectionResults(!doesWhitelistExist) +
                '. ' +
                chalk.dim(`[${((Date.now() - startTime) / 1000).toFixed(2)}s]`)
        )
    }
    if (spinnerHasError) {
        // Set the exit code so that programatic usage of the CLI knows that there were errors.
        spinner.warn(chalk(`Finished with warnings.`))
        process.exitCode = 1
    }
    return result
}

function exe (op, argz, options) {
    return new Promise(function (resolve, reject) {
        const cmd = spawn(op, argz, options)
        let buffer = ''
        let errorBuffer = ''
        cmd.stdout.on('data', data => {
            buffer = buffer + data
        })
        cmd.stderr.on('data', data => {
            errorBuffer = errorBuffer + data
        })
        cmd.on('close', code => {
            code === 0 ? resolve(buffer) : reject(errorBuffer)
        })
    })
}

function esOverlay () {
    const root = './@es'
    const isDirectory = source => fs.lstatSync(source).isDirectory()
    const link = folder => exe('yarn', ['link'], { cwd: folder })
    const applyLink = folder => exe('yarn', ['link', folder.substring(2)])
    return Promise.all(
        fs
            .readdirSync(root)
            .map(d => root + '/' + d)
            .filter(isDirectory)
            .map(dir =>
                link(dir)
                    .then(r => dir)
                    .then(applyLink)
            )
    )
}

function importMaps () {}

async function run () {
    await esOverlay().catch(console.error)
    const results = await webModules().catch(console.error)
    await updateImportMaps(results)
}

run()
