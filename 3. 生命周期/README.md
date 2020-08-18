##  生命周期

这一节说是说生命周期，不如说只是对所有合并策略中的生命周期合并提出来作为例子来说明

在这之前要先说明一下 `Vue.mixin()` 混入方法，如果平时我们直接在全局环境中进行定义，这样会污染全局对象，所以我们使用混入的方式来扩展对象。

```js
Vue.mixin({
  created() {
    console.log('mixin created')
  }
})

const vm = new Vue({
  el: '#app',
  created() {
    console.log('my created')
  }
})
```

在Vue上面定义全局静态方法

```js
export function initGlobalApi(Vue) {
  //Vue.component  Vue.directive等，定义在Vue上的静态属性都会放到这个选项中
  Vue.options = {};    
  Vue.mixin = function(mixin) {
    /*
    例如：  
    this.options = { created: [a, b] }
    */
    // 合并对象  （这里先考虑生命周期）暂时不考虑其他的合并
    this.options = mergeOptions(this.options, mixin) 
  }
```

注意： Vue 构造函数的全局静态属性或者全局静态方法会被放入到 `Vue.options` 中，而构造vm实例的时候会将用户自定义的 `options`参数全部传入进来，最后将 `Vue.options` 上的属性和 实例用户自定义传入的属性做合并，都赋到 `vm.$options` 上。

```js
Vue.prototype._init = function (options) {
  ......
	vm.$options = mergeOptions(vm.constructor.options, options)  // 包含 Vue.options 和 实例用户自定义属性 合并  
  ......
}

```



### 合并策略



先说明一下合并策略，当对于 data、computed、watch等，都定义不同的策略，最后根据不同的需求获得不同的策略

```js
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

strats.data = function(){}
strats.computed = function() {}
strats.watch = function() {}
......

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

//调用 方式，  不同的策略名字有不同的方法
strats[key](xx, xx)
```



### 生命周期的合并



```js
export function initGlobalApi(Vue) {
  Vue.options = {};    
  Vue.mixin = function(mixin) {
    this.options = mergeOptions(this.options, mixin) 
  }
```

注意一开始 `Vue.options={}`  所以传入的 `parent` 参数，一开始是一个空对象。 

```js
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
```

生命周期的合并策略方法如下，最后返回的结果是一个数组，比如 `[created1, created2, ......]`

```js
// 上面提到 一开始 Vue.options = {} 是一个 空对象。 所以 parentVal 传入是undefined
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
```

所以生命周期的合并最后的结果就是一个数组

```js
vm.$options: {
  created: [
    ƒ created(),
    ƒ created(),
    ......
  ]
}
```

最后设置调用生命周期的方法，就是对数组进行循环，执行里面的所有项

```js
export function callHook(vm, hook) {
  const handlers = vm.$options[hook];  //  vm.$options.created = [a1, a2, a3]
  if(handlers) {
    for(let i=0; i<handlers.length; i++) {
      handlers[i].call(vm)   // 更改 生命周期中的 this
    }
  }
}
```

例子：生命周期调用位置

```js
Vue.prototype._init = function() {
  ......
  callHook(vm, 'beforeCreate')
	initState(vm)
	callHook(vm, 'created')
  ......
}
  

export function mountComponent(vm, el) {
  callHook(vm, 'beforeMount')
  vm._update(vm._render());
  callHook(vm, 'mounted')
}
```

