## 初始化

### 开始

- 定义实例属性
  - `vm.$options`
  - `vm._data`    初始化 `data`， 函数/对象  ----》 最终转为对象形式
- 定义原型方法
  - `Vue.prototype._init`



### 数据劫持



`initState(vm)` 方法中被定义



#### 1. data属性定义至vm(实例上)



```js
for(let key in data) {
  proxy(vm, '_data', key)
}
```

```js
function proxy(vm, data, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[data][key]   // vm._data.a
    },
    set(newValue) {
      vm[data][key] = newValue   // vm._data.a = 100
    }
  })
}
```



#### 2. 数据劫持



将 data 上的属性（只有对象和数组），进行数据观测，递归深层次的观察。其他 number、string、null等不进行观测，其中对象和数组的观察方式有所区别。

1. 对象和数组进行观察、劫持，其他类型不观测
2. 在每个观测的对象上增加一个`__ob__`属性表示这个一个被观测过的对象，其值就是相应的观测对象实例

```js
observer(data)

function observer(data) {
  // 只能观察 对象和数组 ，，  null也不行 number string
  if(typeof data !== 'object' || data === null) {
    return;
  }
  // 如果已经被观测过了，也不需要再次重复进行观测了
  if(data.__ob__) {
    return data
  }
  return new Observer(data)
}
```

```js
class Observer {
  constructor(value) {
    // 使用 defineProperty 重新定义属性

    // 判断一个对象是否被观测过看它有没有 __ob__ 这个属性
    defineProperty(value, '__ob__', this)

    if(Array.isArray(value)) {
      // 我希望调用 push shift unshift splice sort reverse pop
      // 函数劫持、切片编程
      value.__proto__ = arrayMethods
      // 观测数组中的对象类型，对象变化也爱做一些事
      this.observerArray(value)
    } else {
      this.walk(value)
    }
  }

  observerArray(value) {
    value.forEach(item => {
      observer(item)   // 观测数组中的对象类型
    })
  }

  walk(data) {
    let keys = Object.keys(data)  
    keys.forEach(key => {
      defineReactive(data, key, data[key])  // Vue.util.defineReactive
    })
  }
}
// 观测 劫持
function defineReactive(data, key, value) {
  observer(value)   // 如果值是对象类型在进行观测
  Object.defineProperty(data, key, {
    get() {
      return value
    },
    set(newVlaue) {
      if(value === newVlaue) return
      observer(newVlaue)   // 如果用户将值改为了对象，我们要对这个对象继续重新进行监控， 如 vm.a = {c: 3}, {c: 3} 新赋上去的 也要重新观测
      value = newVlaue
    }
  })
}
```

重写数组上的变异方法

```js
// 拿到数组原型上的方法 （原来的方法）
let oldArrayProtoMethods = Array.prototype

// 继承一下
export let arrayMethods = Object.create(oldArrayProtoMethods)

let methods = [
  'push',
  'pop',
  'shift',
  'unshift',
  'reverse',
  'sort',
  'splice'
]

methods.forEach(method => {
  arrayMethods[method] = function(...args) {   // this 就是observe里的value
    const result = oldArrayProtoMethods[method].apply(this, args)   
    let inserted;
    let ob = this.__ob__
    switch(method) {
      // 这两个方法都是追加 追加的内容可能是对象类型，应该被再次进行劫持
      case 'push':    // arr.push({a: 1}, {b: 2})
      case 'unshift': 
        inserted = args
        break 
      case 'splice':    // vue.$set 原理
        args.slice(2)   // arr.aplice(0, 1, {a: 1})
        break
      default:
        break
    }

    if(inserted) ob.observerArray(inserted)    // 给数组新增的值也要进行观测
    return result
  }
})
```

