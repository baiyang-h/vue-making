import { mergeOptions } from "../util";

export function initGlobalApi(Vue) {
  //Vue.component  Vue.directive等，定义在Vue上的静态属性都会放到这个选项中
  Vue.options = {};    
  Vue.mixin = function(mixin) {
    /*
    例如：  
    this.options = { created: [a, b] }
    */
    // 合并对象  （这里先考虑生命周期）暂时不考虑其他的合并
    this.options = mergeOptions(this.options, mixin) 
    
  }
  //例如 用户 new Vue({created(){}}) 时进行合并
  /*
    1. 先Vue.options ={} 和 Vue.mixin 全局方法中传进来的值合并一次
    2. 再将合并过后的 Vue.options 再与 new Vue(options) 实例传进来的 options 再合并一次
    3. 所以一共要合并两次 
  */
}

