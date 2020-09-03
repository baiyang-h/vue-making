import { initMixin } from "./init"

function Vue(options) {
  this._init(options)   // 入口方法 初始化操作
}
// 扩展原型在这里扩展
initMixin(Vue)

export default Vue