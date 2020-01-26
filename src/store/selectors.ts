import {
  Effect,
  RootEffect,
  PutEffect,
  PutEffectDescriptor,
  TakeEffect,
  TakeEffectDescriptor
} from "redux-saga/effects";
import { STATUS_RESOLVED } from "./constants";
import { State } from "./types";
import is from "@redux-saga/is";

/* eslint-disable no-cond-assign */
export function getEffectName(state: State, effectId: string) {
  const effect = state.effectsById[effectId].effect;

  // TODO
  if (isRootEffect(effect)) {
    return `${effect.saga.name}`;
  }

  let data;
  if ((data = asPutEffect(effect))) {
    return `put(${data.channel ? data.action : data.action.type})`;
  }

  if ((data = asEffect.take(effect))) {
    return `take(${data.pattern || "channel"})`;
  } else if ((data = asEffect.put(effect))) {
  } else if ((data = asEffect.call(effect))) {
    return `call(${data.fn.name})`;
  } else if ((data = asEffect.cps(effect))) {
    return `cps(${data.fn.name})`;
  } else if ((data = asEffect.fork(effect))) {
    const type = data.detached ? "spawn" : "fork";
    return `${type}(${data.fn.name})`;
  } else if ((data = asEffect.join(effect))) {
    return `join(${data.name})`;
  } else if ((data = asEffect.cancel(effect))) {
    return `cancel(${data.name})`;
  } else if (is.array(effect)) {
    return "parallel";
  } else if ((data = asEffect.race(effect))) {
    return "race";
  } else if ((data = asEffect.select(effect))) {
    return `select(${data.selector.name})`;
  } else if ((data = asEffect.actionChannel(effect))) {
    return `actionChannel(${data.pattern})`;
  } else if ((data = asEffect.cancelled(effect))) {
    return "cancelled";
  } else if ((data = asEffect.flush(effect))) {
    return "flush(buffer)";
  } else if (is.iterator(effect)) {
    return effect.effect.name;
  } else {
    return String(effect);
  }
}

export function getReactions(state, action) {
  let reactions = [];
  const effectsById = state.effectsById;
  Object.keys(effectsById).forEach(effectId => {
    const effect = effectsById[effectId];
    if (asEffect.take(effect.effect)) {
      const status = effect.status;
      if (status === STATUS_RESOLVED) {
        const result = effect.result;
        if (result === action) {
          const task = getTaskForEffect(state, effect);
          reactions.push(task);
        }
      }
    }
  });
  return reactions;
}

export function getTaskForEffect(state, effect) {
  let parentId = effect.parentEffectId;
  while (parentId) {
    const parent = state.effectsById[parentId];
    if (
      parent.root ||
      asEffect.fork(parent.effect) ||
      asEffect.call(parent.effect)
    ) {
      return parentId;
    }
    parentId = parent.parentEffectId;
  }
}

export function getPathToEffect(state, effectId, rootEffectIds) {
  let path = state.effectsById[effectId].path;
  let k = 0;
  while (rootEffectIds.indexOf(path[k]) < 0) {
    k++;
  }
  return path.slice(k);
}

export function isParentOf(effectsById, parentId, effectId) {
  effectId = effectsById[effectId].parentEffectId;
  while (effectId) {
    if (effectId === parentId) {
      return true;
    }
    effectId = effectsById[effectId].parentEffectId;
  }
  return false;
}

export function matchCurrentAction(state, effectId) {
  const effect = state.effectsById[effectId];
  const currentAction = state.sharedRef.currentAction;

  return (
    currentAction &&
    asEffect.take(effect.effect) &&
    effect.result === currentAction.action
  );
}

function isRootEffect(effect: Effect): effect is RootEffect {
  if ((effect as any).root) {
    return true;
  }

  return false;
}

function asTakeEffect(effect: Effect): TakeEffectDescriptor | undefined {
  if (isTakeEffect(effect)) {
    return effect.TAKE;
  }

  return undefined;
}

function isTakeEffect(effect: Effect): effect is TakeEffect {
  return (effect as any)["TAKE"] !== undefined;
}

function asPutEffect(effect: Effect): PutEffectDescriptor<any> | undefined {
  if (isPutEffect(effect)) {
    return effect.PUT;
  }

  return undefined;
}

function isPutEffect(effect: Effect): effect is PutEffect<any> {
  return effect["PUT"] !== undefined;
}
