# nextTick的实现原理

## queueWatcher 队列



```js
const vm = new Vue({
    el: '#app',
    data() {
        return {
            arr: [{a: 1}, 3]
        }
    },
})
// 异步更新，  更新数据后。不能立即拿到最新节点
// nextTick 等待页面更新好后再获取最终dom
setTimeout(() => {
    //  批处理， 渲染应该不需要 执行 5 次， 只需执行一次就行
    vm.arr.push(3)
    vm.arr.push(3)
    vm.arr.push(3)
    vm.arr.push(3)
    //  如果更新数据了  watcher.update() 方法
}, 1000)
```

首先我现在同时改变一个 data 中的数据，同时改变多次，如果不做处理的话，就会同时出发属性的 set 多次，这样也表示这会执行多次 `dep.notify()` ，而每次执行该方法，都会循环调用每个 watcher（包括渲染watcher、观察watcher、计算属性watcher） 实例的 `update`方法，导致重复渲染



那么我们现在要做的就是避免重复渲染，即等到这次执行栈中的所有数据都修改好后，然后只执行一次 update 更新操作。这里我们就需要用到 微任务或者宏任务了，将执行顺序推迟到执行栈执行结束。

```js
class Watcher {
    ...
    
    update() {

    // 这里不要每次都调用 get 方法， get 方法会重新渲染页面
    // 方法是先将 get 方法缓存起来，等数据都改好之后再执行

    queueWatcher(this)      // 暂存的概念，  先存在，要使用时再用

    // this.get()
  }
}
```

```js
let queue = []    //将需要批量更新的 watcher 存到一个队列中，稍后让 watcher 执行、
let has = {}    // 源码通过对象来去重
let pending = false
function queueWatcher(watcher){   
  //  这里我们做去重操作，对于相同的watcher只执行一次
  
  let id = watcher.id
  if(has[id] == null) {   // 如果没有的话 就存入这个watcher和 has 这个id 有则是true
    queue.push(watcher)   
    has[id] = true

    if(!pending) {    // 防抖
      // 等待所有同步代码执行完毕后
      setTimeout(() => {   // 如果还没清空队列，就不要在开定时器了
        queue.forEach(watcher => watcher.run())
        // watcher 都执行完了， 将队列清空
        queue = []
        has = {}
        pending = false
      }, 0)
      pending = true
    }
   
  }
}
```

我们定义一个 queue 队列，将每次要更新时的 watcher 存入到这个队列中，等到所有同步操作都结束后，触发更新。其中，我们确保每次存入到队列中的 watcher 都是唯一的（即、独一的渲染watcher、监听watcher、计算属性watcher），那怎么来进行确保呢？此时就要用到我们一开始定义的 `watcher.id`这个唯一编号了，通过 has 这个对象来实现每次存入的唯一性。

注意这里还用到了一个批处理，即一开始我们通过一个开关 pending 来挂起一个异步操作，这个异步操作会在所有的同步操作结束之后执行，然后关闭开关。之后每次执行 `queueWatcher` 这个方法因为开关已经关闭的原因，所以不会再执行，知道同步任务结束后，异步任务执行。 执行完之后我们在将这个开关打开。



## nextTick

现在我们来了解一下 `nextTick` 的底层，首先先来使用一下 vue 中 nextTick 的使用：

```js
// Vue.nextTick( [callback, context] )

// 在下次 DOM 更新循环结束之后执行延迟回调。在修改数据之后立即使用这个方法，获取更新后的 DOM。

// 修改数据
vm.msg = 'Hello'
// DOM 还没有更新
Vue.nextTick(function () {
  // DOM 更新了
})

// 作为一个 Promise 使用 (2.1.0 起新增，详见接下来的提示)
Vue.nextTick()
  .then(function () {
    // DOM 更新了
  })
```

```js
Vue.component('example', {
  template: '<span>{{ message }}</span>',
  data: function () {
    return {
      message: '未更新'
    }
  },
  methods: {
    updateMessage: function () {
      this.message = '已更新'
      console.log(this.$el.textContent) // => '未更新'
      this.$nextTick(function () {
        console.log(this.$el.textContent) // => '已更新'
      })
    }
  }
})
```

首先 `$nextTick` 内部其实执行的是一个叫做 `nextTick` 的函数，该函数内部执行的是一个异步过程。并且在每次进行 `updtae` 触发进行更新时，内部会先调用这个 `nextTick` 方法，此时如果用户也 定义了 `$nextTick` 方法的话，那么他们都会被推入到一个 `callbacks` 队列中，但是可以明确的是，内部的 nextTick 执行，要比 用户定义的 nextTick 优先，然后循环执行这个`callbacks` 队列中的nextTicks，因为先执行内部的 nextTick 的原因，等第一个执行好之后，其实dom已经更新了，所以我们在用户定义的 nextTick 内部已经可以访问 更新后的 dom了。具体代码如下：

```js
setTimeout(() => {
    //  批处理， 渲染应该不需要 执行 5 次， 只需执行一次就行
    vm.arr.push(3)
    vm.arr.push(3)
    vm.arr.push(3)
    vm.arr.push(3)
    //  如果更新数据了  watcher.update() 方法

    vm.$nextTick(() => {   // 很明显这个方法， 绝对会在  nextTick(flushSchedulerQueue) 的 flushSchedulerQueue 这个回调函数后面执行
        console.log(vm.$el)
    })
}, 1000)
```

```js
class Watcher {
    ......
    update() {
    	queueWatcher(this)    
    }
}
```

```js
// 刷星当前调度的队列,,  这个就是要刷新的那个函数
function flushSchedulerQueue() {
  queue.forEach(watcher => {
    watcher.run()
    watcher.cb()
  })
  queue = []
  has = {}
  pending = false
}

function queueWatcher(watcher){   
  let id = watcher.id
  if(has[id] == null) {   
    queue.push(watcher)   
    has[id] = true
    if(!pending) {    
      nextTick(flushSchedulerQueue)   // flushSchedulerQueue 函数就是那个要刷新的函数
      pending = true
    }
  }
}
```

其中这里代码和上面的都一样。我们将 上面的定时器执行换成 nextTick 方法来执行

```js
export function nextTick(cb) {   // 因为内部会调用 nextTick 用户也会调用，但是异步只需要一次
  callbacks.push(cb)
  if(!pending) {
    // vue3 里 nextTick 原理就是 promise.then 没有做兼容性处理了
    timerFunc()   // 这个方法是异步方法， 做了兼容处理
    pending = true
  }
}
```

每次有调用nextTick 的时候就存入到一个队列中，并且这里也做了一个批处理，即增加了一个开关，等到所有的执行栈执行完后在异步调用callbacks 这个队列中的所有 nextTick 方法，而这个异步函数 timeFunc 如下：

```js
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
```

vue3.0中 nextTick 内部的原理已经改为只有 Promise，已经不考虑别的兼容性了，而2版本做了一些兼容处理，他的兼容处理的顺序如下：

1. `Promise`
2. `MutationObserver`
3. `setImmediate`
4. `setTimeout`

反正都是一些宏微任务，都要等到执行栈全部执行完，才会执行这些任务。即执行 callbacks 队列中 存入的 nextTick 的回调函数。

而又因为，每次数据更新触发视图更新调用 `update` 的方法时，会首先执行内部的 `nextTick(flushSchedulerQueue)`方法

```js
// 刷星当前调度的队列,,  这个就是要刷新的那个函数
function flushSchedulerQueue() {
  queue.forEach(watcher => {
    watcher.run()
    watcher.cb()
  })
  queue = []
  has = {}
  pending = false
}
```

即会先触发更新操作，然后才会触发 用户定义的 nextTick 方法，所以我们在调用用户定义的nextTick时，可以在内部得到更新好后的dom了。



## 总结

```js
内部的nextTick执行的回调  flushSchedulerQueue

用户定义的vm.$nextTick 中的回调   () => {console.log(xxx)}


nextTicks      [flushSchedulerQueue, () => {console.log(xxx)}]

因此在最后循环调用 nextTicks 中的方法时，是先调用第一个更新的nextTick， 已经进行了更新，这样后续的nextTick 都可以获取到更新后的dom了
```

