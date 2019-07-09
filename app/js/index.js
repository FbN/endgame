import React from 'react'
import ReactDOM from 'react-dom'
import tickerView from './views/ticker.js'

function tick() {
  // NO JSX
  // const tick = React.createElement('div', {},
  //       [
  //           React.createElement('h1', {key: 'r1'}, 'Hello, world!'),
  //           React.createElement('h2', {key: 'r2'}, 'It is' + (new Date().toLocaleTimeString()) + '.')
  //       ]
  //   )

  ReactDOM.render(
      // NO JSX
      // tick
    tickerView(new Date().toLocaleTimeString()),
    document.getElementById('app')
  )
}

setInterval(tick, 1000)
