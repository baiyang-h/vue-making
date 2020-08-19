// 多对多的关系  一个属性有一个dep是用来收集watcher的
// dep 可以存多个 watcher ， 如vm.$watcher，渲染watcher，计算属性watcher等
// 一个wathcer 可以对应多个 dep
let id = 0
class Dep {

  constructor() {
    this.subs = []    // 存放watcher
    this.id = id++
  }

  // 将当前收集到的watcher存储起来， 到subs中
  depend() {
    // 我们希望 wathcer 也可以存放dep
    // this.subs.push(Dep.target)

    Dep.target.addDep(this)    // 实现双向记忆的，让 watcher 记住 dep 的同时，让 dep 也记住watcher
  }

  addSub(watcher) {
    this.subs.push(watcher)
  }

  notify() {
    this.subs.forEach(watcher => watcher.update())
  }
}

Dep.target = null;    // 静态属性就一份
export function pushTarget(watcher) {
  Dep.target = watcher     // 保留watcher
}

export function popTarget() {
  Dep.target = null       // 将变量删除掉
}

export default Dep