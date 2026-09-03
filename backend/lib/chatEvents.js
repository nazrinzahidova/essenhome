const { EventEmitter } = require('events');

const emitter = global.__essenChatEvents || new EventEmitter();
emitter.setMaxListeners(500);
global.__essenChatEvents = emitter;

function publish(event) {
  emitter.emit('event', event);
}

function subscribe(listener) {
  emitter.on('event', listener);
  return () => emitter.off('event', listener);
}

module.exports = { publish, subscribe };
