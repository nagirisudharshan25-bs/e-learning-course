// Clean ESM implementation of react-is compatible with React 19 and Vite
const REACT_ELEMENT_TYPE = Symbol.for('react.transitional.element');
const REACT_PORTAL_TYPE = Symbol.for('react.portal');
const REACT_FRAGMENT_TYPE = Symbol.for('react.fragment');
const REACT_STRICT_MODE_TYPE = Symbol.for('react.strict_mode');
const REACT_PROFILER_TYPE = Symbol.for('react.profiler');
const REACT_CONSUMER_TYPE = Symbol.for('react.consumer');
const REACT_CONTEXT_TYPE = Symbol.for('react.context');
const REACT_FORWARD_REF_TYPE = Symbol.for('react.forward_ref');
const REACT_SUSPENSE_TYPE = Symbol.for('react.suspense');
const REACT_SUSPENSE_LIST_TYPE = Symbol.for('react.suspense_list');
const REACT_MEMO_TYPE = Symbol.for('react.memo');
const REACT_LAZY_TYPE = Symbol.for('react.lazy');
const REACT_VIEW_TRANSITION_TYPE = Symbol.for('react.view_transition');
const REACT_CLIENT_REFERENCE = Symbol.for('react.client.reference');

export function typeOf(object: any): any {
  if (typeof object === 'object' && object !== null) {
    const $$typeof = object.$$typeof;
    switch ($$typeof) {
      case REACT_ELEMENT_TYPE:
        switch ((object = object.type)) {
          case REACT_FRAGMENT_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_SUSPENSE_TYPE:
          case REACT_SUSPENSE_LIST_TYPE:
          case REACT_VIEW_TRANSITION_TYPE:
            return object;
          default:
            switch ((object = object && object.$$typeof)) {
              case REACT_CONTEXT_TYPE:
              case REACT_FORWARD_REF_TYPE:
              case REACT_LAZY_TYPE:
              case REACT_MEMO_TYPE:
              case REACT_CONSUMER_TYPE:
                return object;
              default:
                return $$typeof;
            }
        }
      case REACT_PORTAL_TYPE:
        return $$typeof;
    }
  }
  return undefined;
}

export const ContextConsumer = REACT_CONSUMER_TYPE;
export const ContextProvider = REACT_CONTEXT_TYPE;
export const Element = REACT_ELEMENT_TYPE;
export const ForwardRef = REACT_FORWARD_REF_TYPE;
export const Fragment = REACT_FRAGMENT_TYPE;
export const Lazy = REACT_LAZY_TYPE;
export const Memo = REACT_MEMO_TYPE;
export const Portal = REACT_PORTAL_TYPE;
export const Profiler = REACT_PROFILER_TYPE;
export const StrictMode = REACT_STRICT_MODE_TYPE;
export const Suspense = REACT_SUSPENSE_TYPE;
export const SuspenseList = REACT_SUSPENSE_LIST_TYPE;

export const isContextConsumer = (object: any) => typeOf(object) === REACT_CONSUMER_TYPE;
export const isContextProvider = (object: any) => typeOf(object) === REACT_CONTEXT_TYPE;
export const isElement = (object: any) =>
  typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
export const isForwardRef = (object: any) => typeOf(object) === REACT_FORWARD_REF_TYPE;
export const isFragment = (object: any) =>
  typeOf(object) === REACT_FRAGMENT_TYPE || (object && object.type === REACT_FRAGMENT_TYPE);
export const isLazy = (object: any) => typeOf(object) === REACT_LAZY_TYPE;
export const isMemo = (object: any) => typeOf(object) === REACT_MEMO_TYPE;
export const isPortal = (object: any) => typeOf(object) === REACT_PORTAL_TYPE;
export const isProfiler = (object: any) => typeOf(object) === REACT_PROFILER_TYPE;
export const isStrictMode = (object: any) => typeOf(object) === REACT_STRICT_MODE_TYPE;
export const isSuspense = (object: any) => typeOf(object) === REACT_SUSPENSE_TYPE;
export const isSuspenseList = (object: any) => typeOf(object) === REACT_SUSPENSE_LIST_TYPE;

export const isValidElementType = (type: any) =>
  typeof type === 'string' ||
  typeof type === 'function' ||
  type === REACT_FRAGMENT_TYPE ||
  type === REACT_PROFILER_TYPE ||
  type === REACT_STRICT_MODE_TYPE ||
  type === REACT_SUSPENSE_TYPE ||
  type === REACT_SUSPENSE_LIST_TYPE ||
  type === REACT_VIEW_TRANSITION_TYPE ||
  (typeof type === 'object' &&
    type !== null &&
    (type.$$typeof === REACT_LAZY_TYPE ||
      type.$$typeof === REACT_MEMO_TYPE ||
      type.$$typeof === REACT_CONTEXT_TYPE ||
      type.$$typeof === REACT_CONSUMER_TYPE ||
      type.$$typeof === REACT_FORWARD_REF_TYPE ||
      type.$$typeof === REACT_CLIENT_REFERENCE ||
      typeof type.getModuleId !== 'undefined'));

export default {
  typeOf,
  ContextConsumer,
  ContextProvider,
  Element,
  ForwardRef,
  Fragment,
  Lazy,
  Memo,
  Portal,
  Profiler,
  StrictMode,
  Suspense,
  SuspenseList,
  isContextConsumer,
  isContextProvider,
  isElement,
  isForwardRef,
  isFragment,
  isLazy,
  isMemo,
  isPortal,
  isProfiler,
  isStrictMode,
  isSuspense,
  isSuspenseList,
  isValidElementType,
};
