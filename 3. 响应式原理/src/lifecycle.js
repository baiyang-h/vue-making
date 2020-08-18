import { patch } from "./vdom/patch";

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function(vnode) {
    const vm = this
    patch(vm.$el, vnode)

  }
}

export function mountComponent(vm, el) {
  // 调用 render 方法，去渲染 el 属性 

  // 先调用 render 方法创建虚拟节点，再将虚拟节点渲染到页面上
  /*
  vm._render()   创建虚拟节点
  vm._update()   将虚拟节点转为真实dom，渲染到页面
  */
  vm._update(vm._render());

}
