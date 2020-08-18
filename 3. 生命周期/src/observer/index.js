import { arrayMethods } from "./array"
import { defineProperty } from "../util"

class Observer {
  constructor(value) {
    // 使用 defineProperty 重新定义属性

    // 判断一个对象是否被观测过看它有没有 __ob__ 这个属性
    defineProperty(value, '__ob__', this)

    if(Array.isArray(value)) {
      // 我希望调用 push shift unshift splice sort reverse pop
      // 函数劫持、切片编程
      value.__proto__ = arrayMethods
      // 观测数组中的对象类型，对象变化也爱做一些事
      this.observerArray(value)    // 数组中 普通类型是不做观测的
    } else {
      this.walk(value)
    }
  }

  observerArray(value) {
    value.forEach(item => {
      observer(item)   // 观测数组中的对象类型
    })
  }

  walk(data) {
    let keys = Object.keys(data)  
    keys.forEach(key => {
      defineReactive(data, key, data[key])  // Vue.util.defineReactive
    })
  }
}
// 观测 劫持
function defineReactive(data, key, value) {
  observer(value)   // 如果值是对象类型在进行观测
  Object.defineProperty(data, key, {
    get() {
      return value
    },
    set(newVlaue) {
      if(value === newVlaue) return
      observer(newVlaue)   // 如果用户将值改为了对象，我们要对这个对象继续重新进行监控， 如 vm.a = {c: 3}, {c: 3} 新赋上去的 也要重新观测
      value = newVlaue
    }
  })
}

// 观察方法
export function observer(data) {
  // 只能观察 对象和数组 ，，  null也不行 number string
  if(typeof data !== 'object' || data === null) {
    return;
  }
  // 如果已经被观测过了，也不需要再次重复进行观测了
  if(data.__ob__) {
    return data
  }
  return new Observer(data)

  // 只观测存在的属性  data: {a: 1, b: 2}    在后面又加这个 vm.c = 3, 则观测不到， 要使用 $set
  // 数组中更改索引和长度 无法被监控
}