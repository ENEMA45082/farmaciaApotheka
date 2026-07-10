type Handler = (msg: string) => void;
let _handler: Handler = () => {};

export const toastBus = {
  setHandler: (fn: Handler) => { _handler = fn; },
  emit: (msg: string) => { _handler(msg); },
};
