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

  update() {
    this.get()
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