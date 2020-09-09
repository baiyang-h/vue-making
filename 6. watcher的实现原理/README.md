# watch的实现原理

## Vue中的watch

首先来看一下 vue 的用法

```js
var vm = new Vue({
  data: {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: {
      f: {
        g: 5
      }
    }
  },
  watch: {
    a: function (val, oldVal) {
      console.log('new: %s, old: %s', val, oldVal)
    },
    // 方法名
    b: 'someMethod',
    // 该回调会在任何被侦听的对象的 property 改变时被调用，不论其被嵌套多深
    c: {
      handler: function (val, oldVal) { /* ... */ },
      deep: true
    },
    // 该回调将会在侦听开始之后被立即调用
    d: {
      handler: 'someMethod',
      immediate: true
    },
    // 你可以传入回调数组，它们会被逐一调用
    e: [
      'handle1',
      function handle2 (val, oldVal) { /* ... */ },
      {
        handler: function handle3 (val, oldVal) { /* ... */ },
        /* ... */
      }
    ],
    // watch vm.e.f's value: {g: 5}
    'e.f': function (val, oldVal) { /* ... */ }
  }
})
vm.a = 2 // => new: 2, old: 1
```

```js
vm.$watch('a.b.c', function (newVal, oldVal) {
  // 做点什么
})

// 函数
vm.$watch(
  function () {
    // 表达式 `this.a + this.b` 每次得出一个不同的结果时
    // 处理函数都会被调用。
    // 这就像监听一个未被定义的计算属性
    return this.a + this.b
  },
  function (newVal, oldVal) {
    // 做点什么
  }
)
```



## 实现 watch

```js
const vm = new Vue({
    el: '#app',
    data() {
        return {
            b: 1,
            a: {a: {a: 1}}
        }
    },
    watch: {
        // a(val, oldValue) {   // 对象没有老值 都是新的， 只有 普通类型才区分新值老值
        //   console.log(val)
        // }
        // 可能会有 a.a.a 的写法
        'a.a.a': {
            handler(val, oldValue) {
                console.log('watch', val, oldValue)
            },
            // immediate: true
        }
    },
})

/*
 1. 直接key value
 2. 写成key 和 数组的方式
 3. 监控当前实例上的方法
 4. 对象 handler 的写法
*/
```

```js
setTimeout(() => {
    vm.a.a.a = 2000     // 会触发 set 方法   =》 set 方法会触发watcher的run
}, 2000)
```

```js
export function initState(vm) {
  const opts = vm.$options
  ......
  if (opts.watch) {
    initWatch(vm)
  }
}
```

```js
function initWatch(vm) {  
  let watch = vm.$options.watch
  for(let key in watch) {
    const handler = watch[key]   

    if(Array.isArray(handler)) {   // 数组
      handler.forEach(handle => {
        createWatcher(vm, key, handle)
      })
    } else {                      // 字符串、对象、函数
      createWatcher(vm, key, handler)   
    }
  }
}
```

依次执行watch中的内容

```js
function createWatcher(vm, exprOrFn, handler, options) {    // options 可以用来标识， 是用户watcher
  if(typeof handler == "object") {
    options = handler      		// 将对象写法中的一些配置属性赋给 options
    handler = handler.handler   // 提取方法， 重写 。  是一个函数   
  } 
  if(typeof handler == 'string') {
    handler = vm[handler]    //将实例的方法作为handler
  } 
   // key, 方法, 用户传入的选项
  return vm.$watch(exprOrFn, handler, options)   
}
```

`createWatcher`  方法接受4个参数，

- 第一个是vm实例，
- 第二个exprOrFn是一个字符串或函数，如果字符串就是watch 观测的属性key，如果是函数就比如  `vm.$watch(()=>{return xx}, fn)` 这种情况
- 第三个参数是这个监听属性的 回调函数
- 第四个是一个配置对象

进过循环调用`createWatcher`方法，我们 对每个监听的属性 执行了 `vm.$watch(exprOrFn, handler, options)`  ，使相关的监听属性进行了依赖收集，收集到了对应的 监听 watcher， 使得在每次改变属性值时会触发更新，从而也能触发相应的 监听 watcher。

```js
Vue.prototype.$watch = function(exprOrFn, cb, options) {
    // 数据应该依赖这个 watcher  数据变化后应该让watcher从新执行
    let watcher = new Watcher(this, exprOrFn, cb, {...options, user: true})   // user: true 增加一个标识， 表示这是一个 用户 watcher
    if(options.immediate) {
      cb()   // 如果是 immediate 应该立刻执行
    }
  }
```

`Vue.prototype.$watch` 接受3个参数，

- exprOrFn是一个字符串或函数，代表着监听的相关属性
- cb 代表着该属性的相应回调
- options 配置项，如果是监听 watcher 的话，我们给配置项增加一个标识 `user: true`，标识这是一个 监听 watcher

那么时候这个`Vue.prototype.$watch` 会被调用到，在Vue项目初始化时，`initWatch`被调用时，会执行一次 `$watch`方法，其他会被调用到的地方就是 调用 `vm.$watch` 实例方法，也会被调用。

1. 初始化内部会调用
2. vm.$watch 会被调用



ok， 现在我们又要重新回到 Watcher 这个类了



## Watcher

监听 watcher 内部核心代码如下：

```js
class Watcher {
    constructor(vm, exprOrFn, cb, options) {
        this.vm = vm    
        this.exprOrFn = exprOrFn
        this.cb = cb
        this.options = options 
        this.user = options.user       // 这是一个用户watcher, 即 监听watch 
        ......
        if(typeof exprOrFn === 'function') {
            this.getter = exprOrFn
        } else {   // 如果是字符串的话   watch 传过来的key 多数可能是 string
            this.getter = function() {   // exprOrFn可能传递过来的是一个字符串
                // 当去当前实例上取值时 才会触发依赖收集
                let path = exprOrFn.split('.');   // ['a', 'a', 'a']     // 就是 watch 的 key 可能是 a.a.a
                let obj = vm;
                for(let i = 0; i<path.length; i++) {    
                    obj = obj[path[i]]    // 取值
                }
                return obj    // 最后获得到值， 如 data 中相应的值 
            }
        }
        // 默认会先调用一次get方法，进行取值，将结果保留下来，（其实就是默认调用一次时，就是用于依赖收集，不管是 渲染watcher 还是 监听watcher）
        this.value = this.get()     // 默认会调用 get 方法
    }
    
   	......
    
    get() {
        //  Dep.target = watcher
        pushTarget(this)    // 当前watcher实例
        let result = this.getter()    // 调用 exprOrFn   渲染页面时会去取值，只要取值就会执行相关属性的get方法 ，在get方法里面进行依赖收集
        popTarget()       // 渲染完就将watcher删除了

        return result
    }

	// 希望 watcher 执行
    run() {
        let newValue = this.get()   // 新的值
        let oldValue = this.value     //  老的值
        this.value = newValue
        if(this.user) {   //  this.user 表示是 监听watch, 表示监听watch， 
            this.cb.call(this.vm, newValue, oldValue) 
        }
    }

	update() {
        queueWatcher(this)         ---> 
    }

}

function flushSchedulerQueue() {
  queue.forEach(watcher => {
    watcher.run()
    if(!watcher.user) {   // 这个让其在渲染 watcher中去执行，比如这个cb 中有 updated 生命周期函数，在更新后执行
      watcher.cb()        // 其实这个判断放到 run 中去执行也是没问题的
    }
  })
  ......
}
```

现在我们要对之前写的Watcher 类进行增强，增加上 监听 watcher 时的情况：

1. 首先增加上 `this.user = options.user` 表示这个一个 监听 watcher
2. `typeof exprOrFn` 不是函数时的情况，一般不是函数， 是一个字符串的话 他会是监听 watcher的 监听 key， 当然监听 watcher的 key 也有可能是函数，我们先假设他是字符串，此时我们对 `this.getter` 包装成一个函数，内部很关键。这个函数内部主要做了两件事
   1. 不断对这个key， 在vm 中去取值，因为是取值，所以会触发 get 方法进行**依赖收集，对相应的属性，收集这个 监听watcher**
   2. 第二个就是进行取值，取到这个属性对应的在vm中的值是多少
3. 第三步 `this.value = this.get()` 进行依赖收集，进行的就是 2 的内容，`this.value`，就是对应属性的那个值，针对 监听 watcher，渲染 watcher 不用
4. 然后就是等待属性更新，执行 `update` 方法，内部会调用 `run` 方法，`run` 方法内部的 `this.get()`是一个核心方法，这个方法有两个作用，1. 如果是监听 watcher 的话，可以取值和依赖收集， 或者  2. 如果是 渲染 watcher 的话，会进行依赖收集和渲染。那么对于 监听 watcher 来说，这个`run`方法主要有以下作用：
   1. 获取新值newValue、旧值oldValue，传入监听watch相应属性的那个回调函数中，
   2. `this.value` 重新赋予新值 