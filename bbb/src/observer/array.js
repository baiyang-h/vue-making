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