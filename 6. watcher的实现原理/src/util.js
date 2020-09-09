export function proxy(vm, data, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[data][key]   // vm._data.a
    },
    set(newValue) {
      vm[data][key] = newValue   // vm._data.a = 100
    }
  })
}

export function defineProperty(target, key, value) {
  Object.defineProperty(target, key, {
    enumerable: false,  // 不能被枚举，不能被循环出来，就像一个隐藏属性
    configurable: false, 
    value: value
  })
}

export const LIFECYCLE_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed'
];

// 策略模式，对不同的策略，进行不同的合并
const strats = {};
// strats.data = function(){}
// strats.computed = function() {}
// strats.watch = function() {}
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

// 生命周期的合并都在这里
// 该函数返回的是 合并后的生命周期 是 一个数组  [created1, created2, created3 ....]
function mergeHook(parentVal, childVal) {  // 最开始 初始化的时候 parentVal为{} , childVal为外部传入的值
  if(childVal) {                          // 所以最开始初始化 返回[childVal], 后面再执行合并的话就是在这个数组的基础上合并，现在的child数组，等下次合并就称为了parent数组
    if(parentVal) {
      return parentVal.concat(childVal)   // 爸爸和儿子进行拼接
    } else {
      return [childVal]   // {}   {created: function}  // [created]
    }
  } else {
    return parentVal   // 不合并了 采用父亲额
  }
}
// 注意 初始化的时候 Vue.options = {} 是一个空对象，所以 parent 是{}, child为 Vue.mixin 等 全局混入的 options 
export function mergeOptions(parent, child) {
  // 遍历父亲， 可能是 父亲有 儿子没有
  const options = {}
  
  // 先进行这一步先将所有的父的key 都合并上去
  for(let key in parent) {   // 父亲和儿子都有 在这里就处理了
    mergeField(key)
  }

  // 再进行这一步 将孩子的key 附上去，如果父有孩子的key 和 父没有孩子的key（直接赋上去）  情况
  for(let key in child) {   // 儿子有 父亲没有 将儿子多的赋予到父亲上
    if(!parent.hasOwnProperty(key)) {
      mergeField(key)
    }
  }

  // 合并字段
  function mergeField(key) {
    // 根据key 不同的策略来合并
    if(strats[key]) {
      options[key] = strats[key](parent[key], child[key])
    } else {
      // to do 默认合并  ， 暂时 先这么写， 已子为准。如果没合并
      options[key] = child[key]
    }
  }

  return options
}

// 可以得到 渲染更新的时候，先是内部调用了一次 next， 之后如果页面上也使用 vm.$nextTick 的话，也会进行一次调用，不过用户的调用会在内部调用之后
// 所以在渲染的时候，应该先去渲染完页面，然后再调用 用户的 nextTick，  即先处理第一个，再处理第二个
const callbacks = []
let pending = false
function flushCallbacks() {
  while(callbacks.length) {    // 执行完要清空 callbacks 队列
    callbacks.forEach(cb => cb())    // 让 nextTick 中传入的方法依次执行
    let cb = callbacks.pop()
    cb()
  }
  pending = false       // 标识已经执行完毕

}
let timerFunc;
if(Promise) {
  timerFunc = () => {
    Promise.resolve().then(flushCallbacks)        // 异步处理更新
  }
} else if(MutationObserver) {   // 可以监控 dom 的变化，监控完毕后是异步更新
  let observe = new MutationObserver(flushCallbacks)
  let textNode = document.createTextNode(1)     // 先创建一个文本节点
  observe.observe(textNode, {characterData: true})    // 观测文本节点中的内容
  timerFunc = () => {
    textNode.textContent = 2          // 改变文本中的内容， 会更新视图， 会调用 上面绑定的方法
  }
} else if(setImmediate) {
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  timerFunc = () => {
    setTimeout(flushCallbacks)
  }
}
export function nextTick(cb) {   // 因为内部会调用 nextTick 用户也会调用，但是异步只需要一次
  callbacks.push(cb)
  if(!pending) {
    // vue3 里 nextTick 原理就是 promise.then 没有做兼容性处理了
    timerFunc()   // 这个方法是异步方法， 做了兼容处理
    pending = true
  }
}