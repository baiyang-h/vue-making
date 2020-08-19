import { observer } from "./observer/index"
import { proxy } from "./util"

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

}