## 响应式原理（渲染Watcher）

### Watcher



当每次页面中data、props等变化时，视图就会更新。比如 `vm.a = 1` 改变时，页面会重新渲染，进行更新。

渲染 Watcher，整个过程只会执行一次，只在页面初始化加载渲染时，执行一次，通过初始化加载，对模板中的相关属性进行了依赖收集。

Vue中主要存在三大Watcher

1. 渲染 Watcher
2. 监听 Watcher
3. 计算属性 Watcher

```js
// 加载渲染页面的函数
export function mountComponent() {
  
  ......
  
  callHook(vm, 'beforeMount')
  
  let updateComponent = () => {
    vm._update(vm._render());
  }
  //这个 watcher是用于渲染的，只在页面初始渲染的时候执行一次
  new Watcher(vm, updateComponent, () => {
    callHook(vm, 'beforeUpdate')
  }, true)    // 渲染watcher 只是个名字

  callHook(vm, 'mounted')

  ......
}
```

那么我们来写这个重要的渲染 Watcher

```js
import { pushTarget, popTarget } from "./dep";

let id = 0;
class Watcher {
  // 初始化渲染Watcher的 exprOrFn 是上面用于渲染页面的方法，即核心内容是 vm._update(vm._render())
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm       
    this.exprOrFn = exprOrFn      // 渲染Watcher是函数， 监听Watcher是属性名
    this.cb = cb									// 回调，
    this.options = options 				//相关设置
    this.id = id++      					// watcher 的唯一标识， 如渲染Watcher、监听Watcher、计算属性Watcher

    if(typeof exprOrFn === 'function') {
      this.getter = exprOrFn
    }

    this.get()     // 默认初始化会调用 get 方法
  }

  get() {
    //ep.target = watcher
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
```

初始化的的时候，默认会执行`this.get()` 方法，而该方法会进行数据的依赖收集和视图渲染，其中 `this.getter()` 的核心就是执行 `render`方法，得到虚拟DOM，最后在通过`vm._update`方法渲染成真实DOM。在这个过程中会对数据进行取值，而因为取值的原因，所以会触发 `Object.defineProperty`的属性中的 `get` 取值，我们在 `get` 方法里进行依赖收集。如下

```js
// 观测 劫持
function defineReactive(data, key, value) {
  
	......
  
  let dep = new Dep()   // 每个属性都有一个 dep， 并且有且自由一个属于自己的 dep 实例

  // 当页面取值时 说明这个值用来渲染了，将这个watcher和这个属性对应起来
  Object.defineProperty(data, key, {
    get() {
      if(Dep.target) {  // 让这个属性记住这个watcher
        dep.depend()
      }
      return value
    },
    set(newVlaue) {
      
      ......
      
      dep.notify()   // 异步更新

    }
  })
}
```





### Dep



注意每个属性对应一个dep，dep中可以进行依赖收集，数组更新，Dep和Watcher双向记忆的功能。

首先我们要注意上面 `pushTarget(this)` 和 `popTarget()` 这两个方法

- `pushTarget(this)` ：是将当前的渲染 Wathcer 的实例 暂时先绑定到 `Dep.target` 上，
- `popTarget()` ：等到执行好 `this.getter()`方法后，再在 `Dep.target` 进行解绑。

使用以上方法时为了在进行依赖收集的时候，确保 `Dep.target` 上存在 Wathcer 实例，并将该实例存放到当前属性的 `dep` 实例中。

注意：每个属性都有一个 dep 实例，并且有且只有一个属于他的 dep 实例。

在 get 方法中，我们通过 `dep.depend`方法，将当前渲染Watcher实例保存到各自属性的dep实例中的subs中，当我们修改数据时，会触发`Object.defineProperty` 的 `set` 方法，然后触发 `dep.notify()` 来进行对该数据收集到的watcher进行触发。

在 `depend` 方法中，会依次触达 相关 `watcher` 的 `update()` 方法，这就触发了更新。

```js
// 多对多的关系  一个属性有一个dep是用来收集watcher的
// dep 可以存多个 watcher ， 如vm.$watcher，渲染watcher，计算属性watcher等
// 一个wathcer 可以对应多个 dep
class Dep {

  constructor() {
    this.subs = []    // 存放watcher
  }

  // 将当前收集到的watcher存储起来， 到subs中
  depend() {
    this.subs.push(Dep.target)
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
```

但是为了考虑到之后还有计算属性的Watcher，所以我们这里要将Dep和Watcher做成一个双向记忆的功能，让 watcher 记住 dep 的同时，让 dep 也记住 watcher。代码改为如下：

```js
// Dep

let id = 0
class Dep {
  constructor() {
    this.subs = []    
    this.id = id++   // 每个属性都有属于他自己的dep，id就是编号
  }
  
  depend() {
    Dep.target.addDep(this)    // 实现双向记忆的，让 watcher 记住 dep 的同时，让 dep 也记住watcher
  }
  ......
}
```

在Wathcer实例的方法中，当触发 `addDep(dep)` 时，我们会做两件事：

1. 对dep进行去重，保证该 Wathcer 存储的dep不会重复。即当页面上有 3个 `{{name}}`时，此时name属性都一样，但是出现了3次，因为是同一个属性，同一个dep，所以我们要保证在Watcher存储时的唯一性，不会重复存储
2. `dep.depend()` 会间接触发 `wathcer.addDep(dep)`来实现Dep和Watcher的双向记忆，即dep保存wathcer，wathcer也反过来保存dep。这是一个多对多的关系。

```js
// Watcher

class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    ......
    this.deps = []      				// watcher 记录有多少dep依赖
    this.depsId = new Set()    // 主要用于去重，保证存储的 dep 不会重复
		......
  }
  // 使用Set来保证 该Wathcer保存的dep不会重复
  addDep(dep) {
    let id = dep.id;
    if(!this.depsId.has(id)) {
      this.deps.push(dep)
      this.depsId.add(id)
      dep.addSub(this)    // dep 也反过来收集 watcher
    }
  }

}
```



### 数组的更新



此时对于一般改变属性的键来触发更新，我们已经做到了，但是对于如以下的改变数据，并不会触发更新，如：

- 改变数组 `arr.push、arr.pop`等，变异方法
- `Vue.set(obj, key, value)` 改变对象

因此对于对象或数组本身，我们也要做依赖收集，这样当改变对象或数组本身时也会触发依赖更新。具体方法时在对象和数组本身身上我们也给他们有一个 dep 实例。

```js
class Observer {
  constructor(value) {
    ......
    this.dep = new Dep()
    ......
  }
}
```

在`Object.defineProperty`上也做修改，首先获取到对象本身的 observer 实例对象，`let childDep = observer(value)`，在这个实例上我们给对象本身也创建了一个dep实例，然后执行`childDep.dep.depend()`用于搜集依赖。

```js
function defineReactive(data, key, value) {
  // 获取data[key]， 即 value 值的 observer 实例， 如 data = {a: {}, b: []}， 得到 data.a 这个对象和data.b这个数组 的 observer 实例， 在他们身上也有一个dep
  let childDep = observer(value)   // 如果值是对象类型在进行观测

	......

  Object.defineProperty(data, key, {
    get() {
      if(Dep.target) {  
        dep.depend()
        if(childDep) {   // 可能是数组，可能是对象 的 observer 实例
          // 默认给对象或数组增加了一个 dep， 当对数组或对象取值的时候， 比如 当 数组调用 push 等时，可以在那调用 ob.dep.notify() 触发更新
          childDep.dep.depend()   // 当前这个对象和数组 存起来了这个渲染 Watcher
        }
      }
      return value
    },
    set(newVlaue) {
      ......
      dep.notify()   // 异步更新

    }
  })
}
```

在数组中，当触发编译方法的时候，进行依赖更新

```js
methods.forEach(method => {
  arrayMethods[method] = function(...args) {   // this 就是observe里的value
    ......
    ob.dep.notify()   // 通知数组更新
    ......
  }
})
```





### 总结



1. 初始化渲染的时候，创建一个渲染 Watcher 的实例对象，当创建好该实例对象时，默认触发它的 `get()` 方法
2. 在初始化渲染时，`get` 方法中的核心就是 `vm._update(vm._render())` 会触发数据的 `Object.defineProperty`的 `get `方法，进行依赖收集。
3. 并且同时把这个渲染watcher 放到了 `Dep.target` 属性上
4. 每个属性有独属于他的一个dep实例，该实例收集了相关watcher的依赖，这个属性的dep 存储当前的wathcer。当触发`dep.depend()`时会实现 Dep 和 Watcher 的双向记忆，让 watcher 记住 dep 的同时，让 dep 也记住 watcher
5. 当属性更新时，就执行`dep.notify()` 通知自己存储的watcher来更新   `watcher.update()`

