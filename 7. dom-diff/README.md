# dom-diff



先进行一个简单的对比

```html
<div id="a" style="color: red">{{name}}</div>

<div id="b" style="background: orange">{{name}}</div>
```

用新的虚拟节点去对比老的虚拟节点

```js
export function patch(oldVnode, vnode) {
  /** @description 将虚拟节点转化为真实节点 */

  //  默认初始化时 是直接用虚拟节点创建出真实节点来 替换掉老节点
  if(oldVnode.nodeType) {   // oldVnode.nodeTypetrue  表示是真实节点，就是第一次渲染，不需要比较
    // 将vnode虚拟dom转为真实节点，然后将oldVnode真实节点替换掉
     // -----------   不是本节重点 -----------
    let el = createElm(vnode)    // 产生真实的dom
    let parentElm = oldVnode.parentNode   // 获取老的app的父亲 =》  body
    parentElm.insertBefore(el, oldVnode.nextSibling)   // 当前的真实元素插入到 app 后面
    parentElm.removeChild(oldVnode)   // 删除老的节点

    return el
      // -----------    -----------
      
      
  } else {   // 都是虚拟节点， 表示更新  需要对比
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
```

首先进行两个虚拟节点的对比

1. 如果两个元素的标签是不一样的，则直接替换掉，没必要在对比了
2. 可能标签一样，文本内容不一样  `<div>1</div>`   `<div>2</div>`    `oldVnode.tag == undefined` 的对比，直接服用新的文本内容覆盖就得文本节点
3. 最后标签一样，但不是第2种情况， 则开始对比标签属性和儿子。用新的虚拟节点的属性和老的比较，去更新节点

```js
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

  
.....
}
```



