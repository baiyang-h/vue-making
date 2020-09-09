import { observer } from "./observer/index"
import { proxy, nextTick } from "./util"
import Watcher from "./observer/watcher"

export function initState(vm) {
  const opts = vm.$options

  if (opts.props) {
    initProps()
  }
  if (opts.methods) {
    initMethods(vm)
  }
  if (opts.data) {
    initData(vm)
  }
  if (opts.computed) {
    initComputed(vm)
  }
  if (opts.watch) {
    initWatch(vm)
  }
}

function initProps(vm) {

}

function initMethods(vm) {

}

function initData(vm) {
  let data = vm.$options.data
  // 进过处理 data 一定是一个对象了
  vm._data = data = typeof data === 'function' ? data.call(vm) : data

  // 将属性定义到 vm ， 实现数据代理
  for(let key in data) {
    proxy(vm, '_data', key)
  }

  // 数据的劫持方案 对象Object.defineProperty
  // 对 对象和数组 不同的劫持方案
  observer(data)
}

function initComputed(vm) {

}

function initWatch(vm) {  
  let watch = vm.$options.watch
  for(let key in watch) {
    const handler = watch[key]    // handler 可能是

    if(Array.isArray(handler)) {   // 数组
      handler.forEach(handle => {
        createWatcher(vm, key, handle)
      })
    } else {                      // 字符串、对象、函数
      createWatcher(vm, key, handler)   
    }
  }
}

function createWatcher(vm, exprOrFn, handler, options) {    // options 可以用来标识， 是用户watcher
  if(typeof handler == "object") {
    options = handler      // 将对象写法中的一些配置属性赋给 options
    handler = handler.handler   // 提取方法， 重写 。  是一个函数   
  } 
  if(typeof handler == 'string') {
    handler = vm[handler]    //将实例的方法作为handler
  } 
   // key, 方法, 用户传入的选项
  return vm.$watch(exprOrFn, handler, options)   
}

export function stateMixin(Vue) {
  Vue.prototype.$nextTick = function(cb) {
    nextTick(cb)
  }

  Vue.prototype.$watch = function(exprOrFn, cb, options) {
    // 数据应该依赖这个 watcher  数据变化后应该让watcher从新执行
    let watcher = new Watcher(this, exprOrFn, cb, {...options, user: true})   // user: true 增加一个标识， 表示这是一个 用户 watcher
    if(options.immediate) {
      cb()   // 如果是 immediate 应该立刻执行
    }
  }

}