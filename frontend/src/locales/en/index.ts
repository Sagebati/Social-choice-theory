// English, the source language. Every other locale mirrors this tree.

import app from './app'
import cast from './cast'
import journey1 from './journey1'
import journey2 from './journey2'
import pages from './pages'

const en = { ...app, cast, ...journey1, ...journey2, ...pages }

export type Messages = typeof en
export default en
