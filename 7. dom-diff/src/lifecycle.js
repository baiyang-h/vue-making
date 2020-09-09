import { patch } from "./vdom/patch";
import Watcher from './observer/watcher'

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function(vnode) {
    const vm = this

    // 用新的创建的元素，替换老的 vm.$el
    vm.$el = patch(vm.$el, vnode)

  }
}

export function mountComponent(vm, el) {
  // 调用 render 方法，去渲染 el 属性 

  // 先调用 render 方法创建虚拟节点，再将虚拟节点渲染到页面上
  /*
  vm._render()   创建虚拟节点
  vm._update()   将虚拟节点转为真实dom，渲染到页面
  */

  callHook(vm, 'beforeMount')
  
  let updateComponent = () => {
    vm._update(vm._render());
  }
  //这个 watcher是用于渲染的  目前没有任何功能 updateComponent()
  new Watcher(vm, updateComponent, () => {
    callHook(vm, 'updated')
  }, true)    // 渲染watcher 只是个名字

  // 要把属性和watcher绑定到一起

  callHook(vm, 'mounted')

}

// 生命周期 调用
export function callHook(vm, hook) {
  const handlers = vm.$options[hook];  //  vm.$options.created = [a1, a2, a3]
  if(handlers) {
    for(let i=0; i<handlers.length; i++) {
      handlers[i].call(vm)   // 更改 生命周期中的 this
    }
  }
}