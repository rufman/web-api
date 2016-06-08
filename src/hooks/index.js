function hookSort(a, b, highestFirst = true) {
  const direction = highestFirst ? -1 : 1

  if (a.priority > b.priority) {
    return 1 * direction;
  } else if (a.priority < b.priority) {
    return -1 * direction;
  } else {
    if (a._position > b._position) {
      return 1 * direction;
    } else {
      return -1 * direction;
    }
  }

  return 0;
}

export function createHook(id, type = 'before', func, priority = 0) {
  const hook = {
    func    : func,
    id      : id,
    priority: priority,
    type    : type
  };

  return hook;
}

export function addHook(hook, source) {
  switch (hook.type) {
    case 'before':
      hook.before._position = source.hooks.before.length + 1;
      source.hooks.before.push(hook.func);
      break;
    case 'after':
      hook.after._position = source.hooks.after.length + 1;
      source.hooks.after.push(hook.func);
      break;
    case 'error':
      hook.error._position = source.hooks.error.length + 1;
      source.hooks.error.push(hook.func);
      break;
  }
}

export function sortBefore(a, b) {
  return hookSort(a, b)
}

export function sortAfter(a, b) {
  return hookSort(a, b, false)
}

export {
  cacheHook,
  camelTransformHook,
  errorHook,
  normalizeHook,
  paramsHook
};
