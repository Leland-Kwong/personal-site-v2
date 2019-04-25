let eventTypes;

const setupEventTypes = () => {
  eventTypes = new Set();

  Object.keys(window).forEach((key) => {
    const isEvent = key.indexOf('on') === 0;
    if (isEvent) {
      eventTypes.add(key.substring(2));
    }
  });
};

export default function isDOMEvent(eventName) {
  if (!eventTypes) {
    setupEventTypes();
  }
  return eventTypes.has(eventName);
}
