'use strict';

var EventEmitter = require('./lib/event-emitter');

function DropinModel(options) {
  this._listeners = {};
  this._paymentMethods = options && options.paymentMethods ? options.paymentMethods : [];
  this._activePaymentMethod = this._paymentMethods[0];
  this.dependenciesInitializing = 0;

  EventEmitter.call(this);
}

DropinModel.prototype = Object.create(EventEmitter.prototype, {
  constructor: DropinModel
});

DropinModel.prototype.addPaymentMethod = function (paymentMethod) {
  this._paymentMethods.push(paymentMethod);
  this._emit('addPaymentMethod', paymentMethod);
  this.changeActivePaymentMethod(paymentMethod);
};

DropinModel.prototype.changeActivePaymentMethod = function (paymentMethod) {
  this._activePaymentMethod = paymentMethod;
  this._emit('changeActivePaymentMethod', paymentMethod);
};

DropinModel.prototype.getPaymentMethods = function () {
  return this._paymentMethods;
};

DropinModel.prototype.getActivePaymentMethod = function () {
  return this._activePaymentMethod;
};

DropinModel.prototype.asyncDependencyStarting = function () {
  this.dependenciesInitializing++;
};

DropinModel.prototype.asyncDependencyReady = function () {
  this.dependenciesInitializing--;
  if (this.dependenciesInitializing === 0) {
    this._emit('asyncDependenciesReady');
  }
};

module.exports = DropinModel;
