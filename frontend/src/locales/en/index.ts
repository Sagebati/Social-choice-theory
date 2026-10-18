// English, the source language. Every other locale mirrors this tree.

import app from './app'
import cast from './cast'
import deck from './deck'
import pages from './pages'

const en = { ...app, cast, ...deck, ...pages }

export type Messages = typeof en
export default en
