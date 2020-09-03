export function patch(oldVnode, vnode) {
  /** @description 将虚拟节点转化为真实节点 */

  // 将vnode虚拟dom转为真实节点，然后将oldVnode真实节点替换掉
  let el = createElm(vnode)    // 产生真实的dom
  let parentElm = oldVnode.parentNode   // 获取老的app的父亲 =》  body
  parentElm.insertBefore(el, oldVnode.nextSibling)   // 当前的真实元素插入到 app 后面
  parentElm.removeChild(oldVnode)   // 删除老的节点

  return el
}

// 将虚拟节点 转为真实dom
function createElm(vnode) {
  let { tag, children, key, data, text } = vnode
  if(typeof tag === 'string') {    // 创建元素 放到vnode.el上
    vnode.el = document.createElement(tag)

    // 只有元素才有属性
    updateProperties(vnode)

    children.forEach(child => {   // 遍历儿子 将儿子渲染后的结果放放到父亲中
      vnode.el.appendChild(createElm(child))
    })
  } else {
    vnode.el = document.createTextNode(text)
  }
  
  return vnode.el
}

function updateProperties(vnode) {
  let el = vnode.el
  let newProps = vnode.data || {}
  
  // 这里暂时就只写 style class了 ，别的还有 事件啊什么的就不写了，举个例子而已
  for(let key in newProps) {
    if(key === 'style') {   // {color: red}
      for(let styleName in newProps.style) {
        el.style[styleName] = newProps.style[styleName]
      }
    } else if(key === 'class') {
      el.className = el.class
    } else {
      el.setAttribute(key, newProps[key])
    }
  }
}

// vue 的渲染流程  =》 先初始化数据  =》 将模板进行编译  =》  render 函数  =》 生成虚拟节点  =》 生成真实的dom  =》 渲染到页面