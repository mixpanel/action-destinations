import Context from './lib/context'

declare global {
  namespace Express {
    // Additional properties we add to the express Request object
    interface Request {
      context: Context
    }
  }
}

export {}
