export function patch(oldVnode, vnode) {
  /** @description 将虚拟节点转化为真实节点 */
  
  let el = createElm(vnode)    // 产生真实的dom
  let parentElm = oldVnode.parentNode   // 获取老的app的父亲 =》  body
  parentElm.insertBefore(el, oldVnode.nextSibling)   // 当前的真实元素插入到 app 后面
  parentElm.removeChild(oldVnode)   // 删除老的节点

}

// 将虚拟节点 转为真实dom
function createElm(vnode) {
  let { tag, children, key, data, text } = vnode
  if(typeof tag === 'string') {    // 创建元素 放到vnode.el上
    vnode.el = document.createElement(tag)
    children.forEach(child => {   // 遍历儿子 将儿子渲染后的结果放放到父亲中
      vnode.el.appendChild(createElm(child))
    })
  } else {
    vnode.el = document.createTextNode(text)
  }
  
  return vnode.el
}

// vue 的渲染流程  =》 先初始化数据  =》 将模板进行编译  =》  render 函数  =》 生成虚拟节点  =》 生成真实的dom  =》 渲染到页面