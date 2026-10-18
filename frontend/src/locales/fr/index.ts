import type { Messages } from '../en'
import { mapMessages, typesetFrench } from '../typeset'
import app from './app'
import cast from './cast'
import deck from './deck'
import pages from './pages'

const fr: Messages = { ...app, cast, ...deck, ...pages }

export default mapMessages(fr, typesetFrench)
