var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

// console.log(db.knex);

var User = db.Model.extend({
  tableName: 'users',
  initialize: () => {
    db.knex.table('users').insert({username: this.username, password: this.password});
  }
});

module.exports = User;