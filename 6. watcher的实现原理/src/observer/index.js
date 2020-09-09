import { arrayMethods } from "./array"
import { defineProperty } from "../util"
import Dep from "./dep"

class Observer {
  constructor(value) {    
    // 例如 Vue.set(obj, a, 100)   所以对象本身也增加 dep， 不止是数组
    this.dep = new Dep()   // 如果 data = {} 即本身的数据是一个对象或数组时，我就给本身添加一个dep
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
// 观测 劫持，，，  
/* 
这个defineReactive 是在 data 是一个对象时才会执行这个，所以当value为对象时会一直会触发这个方法,
但如果data是数组的话，是不会走到这个方法里来的，只有对象才会走到这里，
所以为了要在数组变化时进行依赖收集和更新，我们对每个数据本身即 data 本身，也增加了一个 dep 实例，
那么当读取数组或对象本身的时候会对本身增加一个dep，当修改数组和对象本身时可以触发渲染
*/

function defineReactive(data, key, value) {
  // 获取data[key]， 即 value 值的 observer 实例， 如 data = {a: {}, b: []}， 得到 data.a 这个对象和data.b这个数组 的 observer 实例， 在他们身上也有一个dep
  let childDep = observer(value)   // 如果值是对象类型在进行观测

  let dep = new Dep()   // 每个属性都有一个 dep

  // 当页面取值时 说明这个值用来渲染了，将这个watcher和这个属性对应起来
  Object.defineProperty(data, key, {
    get() {
      if(Dep.target) {  // 让这个属性记住这个watcher
        dep.depend()
        if(childDep) {   // 可能是数组，可能是对象 的 observer 实例
          // 默认给对象或数组增加了一个 dep， 当对数组或对象取值的时候， 比如 当 数组调用 push 等时，可以在那调用 ob.dep.notify() 触发更新
          childDep.dep.depend()   // 当前这个对象和数组 存起来了这个渲染 Watcher
        }
      }
      return value
    },
    set(newVlaue) {
      if(value === newVlaue) return
      observer(newVlaue)   // 如果用户将值改为了对象，我们要对这个对象继续重新进行监控， 如 vm.a = {c: 3}, {c: 3} 新赋上去的 也要重新观测
      value = newVlaue

      dep.notify()   // 异步更新

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