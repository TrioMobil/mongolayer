var async = require("async");
var validator = require("jsvalidator");

const {
	callbackify
} = require("./utils.js");

var Connection = function(args) {
	var self = this;
	
	args = args || {};
	
	self.db = args.db;
	self.models = {}; // store public facing models
	self.logger = args.logger; // stores method to be called on query execution with log information
	
	self._models = {}; // store arguments of Connection.add()
	self._client = args.client;
	
	self.promises = {
		add : add.bind(self)
	}
}

async function add(args) {
	var self = this;
	
	// args.model
	// args.createIndexes
	
	args.createIndexes = args.createIndexes === undefined ? true : args.createIndexes;
	args.model._setConnection({ connection : self });
	
	// allow option to disable createIndexes on add for performance
	if (args.createIndexes === true) {
		await args.model.promises.createIndexes();
	}
	
	self.models[args.model.name] = args.model;
	self._models[args.model.name] = args;
}

Connection.prototype.add = callbackify(add);

Connection.prototype.remove = function(args, cb) {
	var self = this;
	
	args.model._disconnect();
	delete self.models[args.model.name];
	delete self._models[args.model.name];
	
	cb(null);
}

Connection.prototype.removeAll = function(cb) {
	var self = this;
	
	var calls = [];
	
	Object.keys(self.models).forEach(function(val, i) {
		calls.push(function(cb) {
			self.remove({ model : self.models[val] }, cb);
		});
	});
	
	async.series(calls, cb);
}

Connection.prototype.dropCollection = function(args, cb) {
	var self = this;
	
	// args.name
	var result = validator.validate(args, {
		type : "object",
		schema : [
			{ name : "name", type : "string", required : true }
		],
		allowExtraKeys : false
	});
	
	if (result.err) {
		return cb(result.err);
	}
	
	self.db.dropCollection(args.name, function(err) {
		if (err && err.errmsg.match(/ns not found/) === null) {
			return cb(err);
		}
		
		cb(null);
	});
}

Connection.prototype.close = function(cb) {
	var self = this;
	
	self._client.close(false, cb);
}

module.exports = Connection;