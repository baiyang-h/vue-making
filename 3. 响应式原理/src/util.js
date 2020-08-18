export function proxy(vm, data, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[data][key]   // vm._data.a
    },
    set(newValue) {
      vm[data][key] = newValue   // vm._data.a = 100
    }
  })
}

export function defineProperty(target, key, value) {
  Object.defineProperty(target, key, {
    enumerable: false,  // 不能被枚举，不能被循环出来，就像一个隐藏属性
    configurable: false, 
    value: value
  })
}