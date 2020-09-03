import { pushTarget, popTarget } from "./dep";

let id = 0;
class Watcher {
  // vm 实例
  // exprOrFn  vm._update(vm._render())
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm    
    this.exprOrFn = exprOrFn
    this.cb = cb
    this.options = options 
    this.id = id++      // watcher 的唯一标识
    this.deps = []      // watcher 记录有多少dep依赖
    this.depsId = new Set()    // 主要用于去重，保证存储的 dep 不会重复

    if(typeof exprOrFn === 'function') {
      this.getter = exprOrFn
    }

    this.get()     // 默认会调用 get 方法
  }
  
  addDep(dep) {
    let id = dep.id;
    if(!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)
    }
  }

  get() {
    //  Dep.target = watcher
    pushTarget(this)    // 当前watcher实例
    this.getter()    // 调用 exprOrFn   渲染页面时会去取值，只要取值就会执行相关属性的get方法 ，在get方法里面进行依赖收集
    popTarget()       // 渲染完就将watcher删除了
  }

  // 希望 watcher 执行
  run() {
    this.get()   // 渲染逻辑
  }

  update() {

    // 这里不要每次都调用 get 方法， get 方法会重新渲染页面
    // 方法是先将 get 方法缓存起来，等数据都改好之后再执行

    queueWatcher(this)      // 暂存的概念，  先存在，要使用时再用

    // this.get()
  }
}

let queue = []    //蒋需要批量更新的 watcher 存到一个队列中，稍后让 watcher 执行、
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

export default Watcher

/*
在数据劫持的时候 定义defineProperty的时候 已经给每个属性都增加了一个dep

1. 是想把这个渲染watcher 放到了 Dep.target 属性上
2. 开始渲染 取值会调用get方法，需要让这个属性的dep 存储当前的wathcer
3. 页面上所需要的属性都会将这个watcher存在自己的dep中
4. 等会属性更新了 就重新调用渲染逻辑 通知自己存储的watcher来更新   watcher.update()
*/