import type { Messages } from '../en'
import { mapMessages, typesetFrench } from '../typeset'
import app from './app'
import cast from './cast'
import journey1 from './journey1'
import journey2 from './journey2'
import pages from './pages'

const fr: Messages = { ...app, cast, ...journey1, ...journey2, ...pages }

export default mapMessages(fr, typesetFrench)
