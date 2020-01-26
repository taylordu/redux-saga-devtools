import is from "@redux-saga/is";
import { SAGA_ACTION } from "@redux-saga/symbols";
import { createStore, Dispatch } from "redux";
import rootReducer, { effectIds } from "./reducers";
import {
  EFFECT_TRIGGERED,
  EFFECT_RESOLVED,
  EFFECT_REJECTED,
  EFFECT_CANCELLED,
  ACTION_DISPATCHED
} from "./constants";
import { Store } from "redux";
import { State } from "./types";

function getTime() {
  if (typeof performance !== "undefined" && performance.now)
    return performance.now();
  else return Date.now();
}

export default function createSagaMonitor({
  time = getTime,
  dispatch: customDispatch
} = {}) {
  let store: Store<State>;
  let dispatch: Dispatch<State>;

  if (typeof customDispatch === "function") {
    dispatch = customDispatch;
  } else {
    store = createStore<State>(rootReducer);
    dispatch = store.dispatch;
  }

  function effectTriggered(effect) {
    dispatch({
      type: EFFECT_TRIGGERED,
      effect,
      time: time()
    });
  }

  function effectResolved(effectId, result) {
    if (is.task(result)) {
      result.done.then(
        taskResult => {
          if (result.isCancelled()) effectCancelled(effectId);
          else effectResolved(effectId, taskResult);
        },
        taskError => {
          effectRejected(effectId, taskError);
        }
      );
    } else {
      const action = {
        type: EFFECT_RESOLVED,
        effectId,
        result,
        time: time()
      };
      dispatch(action);
    }
  }

  function effectRejected(effectId, error) {
    const action = {
      type: EFFECT_REJECTED,
      effectId,
      error,
      time: time()
    };
    dispatch(action);
  }

  function effectCancelled(effectId) {
    const action = {
      type: EFFECT_CANCELLED,
      effectId,
      time: time()
    };
    dispatch(action);
  }

  function actionDispatched(action) {
    const isSagaAction = action[SAGA_ACTION];
    const now = time();
    dispatch({
      type: ACTION_DISPATCHED,
      id: now,
      action,
      isSagaAction,
      time: now
    });
  }

  function rootSagaStarted(rootSagaInfo: {
    effectId: number;
    saga: any;
    args: any[];
  }) {}

  return {
    get store() {
      return store;
    },
    effectTriggered,
    effectResolved,
    effectRejected,
    effectCancelled,
    actionDispatched,
    rootSagaStarted
  };
}
