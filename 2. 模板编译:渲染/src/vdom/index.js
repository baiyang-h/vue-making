export function renderMixin(Vue) {

  Vue.prototype._c = function() {   // 创建元素   创建虚拟dom元素
    return createElement(...arguments)
  }

  Vue.prototype._s = function(val) {   // stringify   {{ xx }}
    return val == null ? '' : (typeof val === 'object') ? JSON.stringify(val) : val
  }

  Vue.prototype._v = function(text) {  // 创建文本元素  创建虚拟文本元素
    return createTextVnode(text)
  }

  Vue.prototype._render = function() {
    const vm = this

    const render = vm.$options.render

    let vnode = render.call(vm)

    return vnode
  }
}

// _c('div', {}, 1, 2, 3)
function createElement(tag, data={}, ...children) {
  return vnode(tag, data, data.key, children)
}

function createTextVnode(text) {
  return vnode(undefined, undefined, undefined, undefined, text)
}

// 用来产生虚拟dom
function vnode(tag, data, key, children, text) {
  return {
    tag,
    data,
    key,
    children,
    text
  }
}