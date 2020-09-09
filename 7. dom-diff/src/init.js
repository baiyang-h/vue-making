// vue 里面核心特性 响应式数据原理
// Vue 是一个什么样的框架 ？
// 数据变化视图会更新，视图变化数据会被影响，（MVVM）却定义着 不能跳过数据去更新视图，Vue中有 $ref 可以去直接修改，所以 Vue 并不算是一个MVVM框架

import { initState } from "./state";
import { compileToFunctions } from "./compiler/index";
import { mountComponent, callHook } from "./lifecycle";
import { mergeOptions } from "./util";

// 扩展状态这里 扩展
export function initMixin(Vue) {
  // 初始化方法
  Vue.prototype._init = function (options) {
    const vm = this;
     // 需要将用户自定义的 options 和全局的 options 做合并  , 即 将 构造函数.options 属性和 实例传入的options 做合并
    //  比如 Vue.options 和 vm实例 上 传入的 参数
    vm.$options = mergeOptions(vm.constructor.options, options)
    // console.log(vm.$options)   // [{created: Array(2)}]

    // 初始化状态（将数据做一个初始化的劫持 当我改变数据时应该更新视图）
    // vue组件中有很多状态 data props watch computed

    callHook(vm, 'beforeCreate')
    initState(vm)
    callHook(vm, 'created')

    // 如果当前有 el 属性说明要渲染模板
    if(vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }

  Vue.prototype.$mount = function(el) {
    // 挂载操作
    const vm = this;
    const options = vm.$options
    el = document.querySelector(el)
    vm.$el = el
    
    if(!options.render) {
      // 没render 将 template 转化为 render 方法
      let template = options.template;
      // 有template 并且有 el 才进行编译操作
      if(!template && el) {
        template = el.outerHTML
      }
      // 编译原理 将模板编译成 render 函数
      // 将 template 转为 render 函数
      const render = compileToFunctions(template)
      // 渲染时用的都是这个render方法
      options.render = render;   
    }

    // 需要挂载这个组件
    mountComponent(vm, el)

    

  }
}