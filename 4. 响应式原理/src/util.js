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


