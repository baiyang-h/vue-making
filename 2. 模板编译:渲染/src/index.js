import { initMixin } from "./init"
import { lifecycleMixin } from "./lifecycle"
import { renderMixin } from "./vdom/index"

function Vue(options) {
  this._init(options)   // 入口方法 初始化操作
}
// 扩展原型在这里扩展
initMixin(Vue)
lifecycleMixin(Vue)   // 混合生命周期
renderMixin(Vue)

export default Vue