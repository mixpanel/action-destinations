'use strict'

class Integration {
    constructor(name) {
        this.name = name
        this.variables = {}
        this.helpers = {}
        this.subscriptions = []
    }

    // public api

    variable(key, defaultValue, opts) {
        this.variables[key] = new Variable(defaultValue, opts)
        return this
    }

    helper(name, fn) {
        this.helpers[name] = new Helper(fn)
        return this
    }

    subscribe(opts) {
        const sub = new Subscription(opts)
        this.subscriptions.push(sub)
        return sub
    }

    // private api

    __resolve(event, set)
}

class Variable {
    constructor(defaultValue, opts) {
        this.defautlValue = defaultValue
        this.opts = opts
    }

    validate() {
        // TODO
    }

    resolve() {
        // TODO
    }
}

class Helper {
    constructor(fn) {
        this.fn = fn
    }

    resolve({event, variables, helpers}) {
        this.fn({event, variables, helpers})
    }
}

class Subscription {
    constructor(opts) {
        this.opts = opts
        this.variables = {}
        this.helpers = {}
        this.stack = []
    }

    variable(key, defaultValue, opts) {
        this.variables[key] = new Variable(defaultValue, opts)
        return this
    }

    helper(name, fn) {
        this.helpers[name] = new Helper(fn)
        return this
    }

    forEach(fn) {
        const fe = new ForEach(this, fn)
        this.stack.push(fe)
        return fe
    }
}

class ForEach {
    constructor(parent, fn) {
        this.parent = fn
        this.stack = []
    }

    resolve() {
        // TODO
    }

    post() {
        this.stack.push('TODO')
        return this
    }

    end() {
        return this.parent
    }
}

module.exports.destination = function (name) {
    return new Integration(name)
}

module.exports.validate = {
    isURL: function() {
        // TODO
    },
    matchRegex: function() {
        // TODO
    },
    notEmpty: function() {
        // TODO
    }
}

module.exports.handlebars = function (strings) {
    return function() {
        return 'TODO'
    }
}
