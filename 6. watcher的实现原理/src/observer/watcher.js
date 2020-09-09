import { pushTarget, popTarget } from "./dep";
import { nextTick } from "../util";

let id = 0;
class Watcher {
  // vm 实例
  // exprOrFn  vm._update(vm._render())
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm    
    this.exprOrFn = exprOrFn
    this.cb = cb
    this.options = options 
    this.user = options.user       // 这是一个用户watcher, 即 监听watch 
    this.id = id++      // watcher 的唯一标识
    this.deps = []      // watcher 记录有多少dep依赖
    this.depsId = new Set()    // 主要用于去重，保证存储的 dep 不会重复
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
  
  addDep(dep) {
    let id = dep.id;
    if(!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)
    }
  }

  // 1. 得到新值  或者 2. 进行重新更新 
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

    // 这里不要每次都调用 get 方法， get 方法会重新渲染页面
    // 方法是先将 get 方法缓存起来，等数据都改好之后再执行

    queueWatcher(this)      // 暂存的概念，  先存在，要使用时再用

    // this.get()
  }
}

let queue = []    //将需要批量更新的 watcher 存到一个队列中，稍后让 watcher 执行、
let has = {}    // 源码通过对象来去重
let pending = false

// 刷星当前调度的队列,,  这个就是要刷新的那个函数
function flushSchedulerQueue() {
  queue.forEach(watcher => {
    watcher.run()
    if(!watcher.user) {   // 这个让其在渲染 watcher中去执行，比如这个cb 中有 updated 生命周期函数，在更新后执行
      watcher.cb()        // 其实这个判断放到 run 中去执行也是没问题的
    }
  })
  queue = []
  has = {}
  pending = false
}

function queueWatcher(watcher){   
  //  这里我们做去重操作，对于相同的watcher只执行一次
  
  let id = watcher.id
  if(has[id] == null) {   // 如果没有的话 就存入这个watcher和 has 这个id 有则是true
    queue.push(watcher)   
    has[id] = true

    if(!pending) {    // 防抖
      // 等待所有同步代码执行完毕后
      // setTimeout(() => {   // 如果还没清空队列，就不要在开定时器了
      //   queue.forEach(watcher => watcher.run())
      //   // watcher 都执行完了， 将队列清空
      //   queue = []
      //   has = {}
      //   pending = false
      // }, 0)

      // 你可以把他认为这个 nextTick 就类似上面的这个定时器
      nextTick(flushSchedulerQueue)   // flushSchedulerQueue 函数就是那个要刷新的函数

      pending = true
    }
   
  }
}

export default Watcher

/*
在数据劫持的时候 定义defineProperty的时候 已经给每个属性都增加了一个dep

1. 是想把这个渲染watcher 放到了 Dep.target 属性上
2. 开始渲染 取值会调用get方法，需要让这个属性的dep 存储当前的wathcer
3. 页面上所需要的属性都会将这个watcher存在自己的dep中
4. 等会属性更新了 就重新调用渲染逻辑 通知自己存储的watcher来更新   watcher.update()
*/