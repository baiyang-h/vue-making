export function patch(oldVnode, vnode) {
  /** @description 将虚拟节点转化为真实节点 */

  //  默认初始化时 是直接用虚拟节点创建出真实节点来 替换掉老节点
  if(oldVnode.nodeType) {
    // 将vnode虚拟dom转为真实节点，然后将oldVnode真实节点替换掉
    let el = createElm(vnode)    // 产生真实的dom
    let parentElm = oldVnode.parentNode   // 获取老的app的父亲 =》  body
    parentElm.insertBefore(el, oldVnode.nextSibling)   // 当前的真实元素插入到 app 后面
    parentElm.removeChild(oldVnode)   // 删除老的节点

    return el
  } else {
    // 在更新的时候 拿老的虚拟节点 和 新的虚拟节点做对比， 将不同的地方更新真实的dom
    // 更新功能
    
    // 1. 比较两个元素的标签，标签不一样直接替换掉即可
    if(oldVnode.tag !== vnode.tag) {
      // 老的dom元素
      return oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el)
    } 

    // 2. 有种可能是标签一样 <div>1</div>   <div>2</div>    两个标签一样，比儿子 儿子是文本
    // 文本节点的虚拟节点tag 都是undefined
    if(!oldVnode.tag) {   // 文本比对。   因为上面已经是oldVnode.tag !== vnode.tag 判断过了， 所以走到这里的话 就表示 oldVnode.tag === vnode.tag， 这里又取非  vnode.tag==undefined 没标签， 就是文本的比对
      if(oldVnode.text !== vnode.text) {
        return oldVnode.el.textContent = vnode.text
      }
    }

    // 3. 标签一样 并且需要开始比对标签的属性和儿子了
    // 标签一样直接服用即可
    let el = vnode.el = oldVnode.el   // 复用老节点

    // 1. 更新属性， 用新的虚拟节点的属性和老的比较，去更新节点
    // 新老属性做对比 
    updateProperties(vnode, oldVnode.data)


  }
}

// 将虚拟节点 转为真实dom
export function createElm(vnode) {
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

function updateProperties(vnode, oldProps={}) {
 
  // 新的有  那就直接用新的去做更新即可

  let el = vnode.el   // 这里的el 其实在上一层，如果是相同标签的情况下，先将旧的 el 赋给 新的 el， 就是这里这个，， 然后再这个el上进行操作
  let newProps = vnode.data || {}  // 新的属性

  // 老的有新的没有  需要删除
  for(let key in oldProps) {
    if(!newProps[key]) {
      el.removeAttribute(key)   // 移除真实dom的属性
    }
  }

  //  样式处理  老的 style={color: red}  新的 style={background: red}   是要讲老的不同的都删掉，然后赋上这个新的
  let newStyle = newProps.style || {}
  let oldStyle = oldProps.style || {}
  // 老的样式中有  新的没有  删除老的样式
  for(let key in oldStyle) {
    if(!newStyle[key]) {
      el.style[key] = ''
    }
  } 

  
  // 这里暂时就只写 style class了 ，别的还有 事件啊什么的就不写了，举个例子而已
  for(let key in newProps) {
    if(key === 'style') {   // {color: red}
      for(let styleName in newProps.style) {
        el.style[styleName] = newProps.style[styleName]
      }
    } else if(key === 'class') {
      el.className = newProps.class
    } else {
      el.setAttribute(key, newProps[key])
    }
  }
}

// vue 的渲染流程  =》 先初始化数据  =》 将模板进行编译  =》  render 函数  =》 生成虚拟节点  =》 生成真实的dom  =》 渲染到页面