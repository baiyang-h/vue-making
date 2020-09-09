import { initMixin } from "./init"
import { lifecycleMixin } from "./lifecycle"
import { renderMixin } from "./vdom/index"
import { initGlobalApi } from "./global-api/index"
import { stateMixin } from './state'

function Vue(options) {
  this._init(options)   // 入口方法 初始化操作
}
// 扩展原型在这里扩展   原型方法
initMixin(Vue)        // init 方法
lifecycleMixin(Vue)   // _update
renderMixin(Vue)      // _render
stateMixin(Vue)

// 静态方法  Vue.component  Vue.directive  Vue.extend  Vue.mixin 等等
initGlobalApi(Vue)


// 为了看到diff的整个流程 创建两个虚拟节点来进行对比操作
import { compileToFunctions } from './compiler/index'
import { createElm, patch } from './vdom/patch'
let vm1 = new Vue({data: {name: 'zf'}})
let render1 = compileToFunctions('<div id="a" style="color: red">{{name}}</div>')
let vnode1 = render1.call(vm1)      //  render 方法返回的是虚拟dom

document.body.appendChild(createElm(vnode1))

let vm2 = new Vue({data: {name: 'jw'}})
let render2 = compileToFunctions('<div id="b" style="background: orange">{{name}}</div>')
let vnode2 = render2.call(vm2)      //  render 方法返回的是虚拟dom

setTimeout(() => {
  // 用新的虚拟节点对比老的虚拟节点 ，找到差异 去更新老的dom元素
  patch(vnode1, vnode2)   // 传入新的虚拟节点 和老的做一个对比
}, 1000)

// 初始化方法
export default Vue