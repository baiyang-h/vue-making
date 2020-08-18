import { initMixin } from "./init"
import { lifecycleMixin } from "./lifecycle"
import { renderMixin } from "./vdom/index"

function Vue(options) {
  this._init(options)   // 入口方法 初始化操作
}
// 扩展原型在这里扩展
initMixin(Vue)        // init 方法
lifecycleMixin(Vue)   // _update
renderMixin(Vue)      // _render

// 初始化方法
export default Vue