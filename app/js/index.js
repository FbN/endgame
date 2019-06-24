import React from 'react'
import ReactDOM from 'react-dom'

const Hello = function (name) {
    return React.createElement('h1', {}, 'Hello ' + name)
}

const view = Hello('World')

ReactDOM.render(view, document.getElementById('app'))
