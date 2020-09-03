## 渲染



### 模板编译顺序



1. 默认会先找 render 方法
2. 默认没有传入 render 方法会查找 template
3. 当都没有时会找当前 el 指定的元素中的内容来进行渲染

顺序：render -》 template -》 el

对于 template 模板的模式，我们需要使用 ast 解析 template 将其转为 render 函数

```js
// 是render则直接使用render

// 无render函数时，有template时， 将template转为render函数

// 无render 无template时，使用el作为模板
if(!template && el) {
  template = el.outerHTML
}

// 最后将 template 模板转为 render 函数，并将render挂载到options属性上
const render = compileToFunctions(template)
options.render = render;
```

```js
function compileToFunctions(template) {
  let ast = parseHTML(template)   // 将html模板先转为ast抽象语法树
  return ast 
}
```



### 将模板转为AST抽象语法树



我们将html代码转化为 AST 语法树（ast树可以用来描述语言本身，如 html、js等）。而虚拟 dom 使用对象来描述节点的，但是 AST 是用来描述语言本身的，所以是不一样的，一个是对语法转义，一个是对结构转义。	

例如将 `<div>hello {{name}} <span>world</span></div>` 转为 AST

```html
<div>hello {{name}} <span>world</span></div>
```

```js
{
  tag: 'div',
  parent: null,
  type: 1,
  attrs: [],
  children: [
    {
      tag: null,
      parent: 父div,
      attrs: [],
      text: hello {{name}}
    },
    {
      tag: 'span',
      parent: 父div,
      ......
    }
  ]
}
```

得到AST抽象语法树

```js
// 将标签转为AST
function createASTElement(tagName, attrs) {
  return {
    tag: tagName,   // 标签名
    type: 1,        // 元素类型
    children: [],   // 孩子列表
    attrs,          // 属性集合
    parent: null    // 父
  }
}
```

```html
<!-- 正常 -->
<div>
  <p>
    <span></span>
  </p>      
  <i></i>
</div>

<!-- 没有闭合标签，不合法 -->
<div>
	<span>     
</div>
```

通过创建一个 stack 栈，当每次遇到一个开头标签时，将该标签的 ast 放入到 stack 栈中，等到遇到结束标签时就将在 stack 栈中的最后一个弹出，如果弹出的数据和当前的 ast 标签不一致，则表示标签不合法存在问题。

在这个过程中，再通过子存父数据，父存子数据，双向互存来实现最后的root，整棵树。

```js
//以下的名称可以当成是 ast 数据
// stack
1.  [div]
2.  [div, p]
3.  [div, p, span]
4.  [div, p]       // </span> 遇到的第一个 </span> 结束符，将stack中最后一个取出做比较， 结果都是 span,, 如果不一致就表示标签闭合不正常
5.  [div]
6.  []
```



```js
let root;
let currentParent;
let stack = [];
//  标签是否符合预期 <div><span></div>  错误的  校验标签是否合法
// 用一个栈型结构  [div, span]   遇到开始标签 放入栈中， 遇到结束标签 拿出栈中最后一个做比较是否正常

// 将一个个AST标签存入到 stack 栈中
function start(tagName, attrs) {  // 开头标签   <div>
  let astElement = createASTElement(tagName, attrs)
  if(!root) {
    root = astElement
  }
  currentParent = astElement;  // 当前解析的标签 保存起来
  stack.push(currentParent)    // 将生产的ast放到栈中
}
	
// 主要通过把栈中的最后一个取出来，通过子存父，父存子数据，实现双向互存，最后形成整一棵AST树
function end(tagName) {   // 在结尾标签处 创建父子关系   </div>
  let astElement = stack.pop()   // 去除栈中的最后一个
  currentParent = stack[stack.length-1]
  if(currentParent) {   // 在闭合时可以知道这个标签的父亲是谁
    astElement.parent = currentParent
    currentParent.children.push(astElement)
  } 
}

// 存入 文本 的AST形态
function chars(text) {				//文本
  text = text.replace(/\s/g, '')
  if(text) {
    currentParent.children.push({
      type: 3,
      text
    })
  }
}
```

思想就是通过正则匹配将一个html，从开头到结尾进行匹配，在匹配的过程中进过处理最终得到一颗AST抽象语法树。

1. 其中对于`<xx key=value>`、`</xx>`、`文本`等进行匹配并转为AST，然后将相应的AST数据保存
2. 对匹配到的 html 进行截取，匹配到一部分就截取掉一部分，直到将该 html 全部解析完成

```js
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 标签名
// ?:匹配不捕获
const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // </my:xx>
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则 捕获的内容是标签名
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的    aaa="aaa"  a='aaa'   a=aaa
const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 >    >   <div></div>  <br/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
```

```js
// 将 html 模板解析成一颗 ast 抽象语法树
function parseHTML(html) {
  
  ...... 上面的代码
  
  while(html){  // 只要 html 不为空字符串就一直解析
    
    let textEnd = html.indexOf('<');
    
    // 匹配开始标签和结尾吧标签，， 以 < 开始
    if(textEnd === 0) {
      // v-bind v-on <!DOCTYPE  ....  等这些暂时没处理
      // 肯定是标签
      const startTagMatch = parseStartTag();  // 开始标签匹配的结果
      if(startTagMatch) {    // 处理开始标签
        start(startTagMatch.tagName, startTagMatch.attrs)
        continue
      }
			
      const endTagMatch = html.match(endTag)
      if(endTagMatch) {    // 处理结束标签
        advance(endTagMatch[0].length)
        end(endTagMatch[1])    // 将结束标签传入
        continue
      }
    }
    
    let text;
    if(textEnd > 0) {   // 处理文本
      text = html.substring(0, textEnd)
    }
    if(text) {    
      advance(text.length)
      chars(text)
    }
  }
  
  
  // 将字符串进行截取操作，在更新html内容。  就是将前面的截取掉
  function advance(n) {
    html = html.substring(n)
  }

  // 匹配开始标签，获取开始标签、标签属性
  /*
  	返回结构类似如下
    {
			tagName: 'div',
			attrs: [{name: 'id', value: 'app'}, ......],
    }
  */
  function parseStartTag() {
    const start = html.match(startTagOpen)
    if(start) {
      const match = {
        tagName: start[1],
        attrs: []
      }
      advance(start[0].length)   // 删除开始标签
      // 如果直接是闭合标签了 说明没有属性
      let end;
      let attr;
      // 不是结尾标签  能匹配到属性
      while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5]   // 因为上面正则匹配中 括号的原因 有 "", '', 不写， 所以match匹配的话会索引处不同
        })
        advance(attr[0].length)    // 去掉当前属性
      }
      
      if(end) {  		// >
        advance(end[0].length)
        return match
      }
    }
  }

  return root
}
```

最终结果如下

```js
{
  attrs: [
    {name: "id", value: "app"},
    {name: "style", value: {color: " red", "": undefined}}
  ],
  children: [
    {type: 3, text: "hello{{name}}"},
    {
      attrs: [],
      children: [{type: 3, text: "hello"}],
      parent: {tag: "div", type: 1, children: Array(2), attrs: Array(2), parent: null},
      tag: "span",
      type: 1
    }
  ],
  parent: null，
  tag: "div"，
  type: 1
}
```



### 将AST抽象语法树转为render函数



1. 先将ast抽象语法树转为一个字符串的运行式

```js
// 返回结果如下： _c('div', {id:"app",style:{"color":" red"}},_v("hello"+_s(name)),_c('span', undefined,_v("hello")))

let code = generate(ast)   
```

```js
export function generate(ast) {
  /* 将AST抽象语法树转义成  如下结构
    render() {
      return _c('div', {id: 'app', style: {color: 'red'}}, _v('hello'+_s(name)),_c('span', null, _v('hello')))
    } 
  */
  // 语法层面的转义
  let children = getChildren(ast)
  let code = `_c('${ast.tag}', ${
    ast.attrs.length ? `${genProps(ast.attrs)}` : 'undefined'
  }${
    children?`,${children}`:''
  })`
  
  return code
}


// 对属性做处理
function genProps(attrs) {
  let str = ''
  for(let i=0; i<attrs.length; i++) {
    let attr = attrs[i];
    if(attr.name === 'style') {  //对样式进行特殊处理
      let obj = {}
      attr.value.split(';').forEach(item => {
        let [key, value] = item.split(':')
        obj[key] = value
      });
      attr.value = obj
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  }

  return `{${str.slice(0, -1)}}`;
}


// 处理children
function getChildren(ast) {
  const children = ast.children;
  if(children) {   // 将所有转化后的儿子用逗号拼接起来
    return children.map(child => gen(child)).join(',')
  }
}


function gen(node) {
  // node 可能一种是文本，一种可能是标签
  if(node.type === 1) {
    return generate(node)   // 生成元素节点的字符串
  } else {
    let text = node.text   // 获取文本
    // 如果是普通文本  不带{{}}
    if(!defaultTagRE.test(text)) {
      return `_v(${JSON.stringify(text)})`  // _v('hello {{name}} world {{msg}}')  => _v('hello'+_s(name)+'world'+_s(msg))
    }
    let tokens = []
    let lastIndex = defaultTagRE.lastIndex = 0    // 如果正则是全局模式 需要每次使用前置为0
    let match, index;    // 每次匹配搭到的结果

    while(match = defaultTagRE.exec(text)) {
      index = match.index;   // 保存匹配到的索引
      if(index > lastIndex) {
        tokens.push(JSON.stringify(text.slice(lastIndex, index)))
      }
      tokens.push(`_s(${match[1].trim()})`);
      lastIndex = index + match[0].length
    }
    if(lastIndex < text.length) {
      tokens.push(JSON.stringify(lastIndex))
    }
    return `_v(${tokens.join('+')})`
  }
}
```

最终返回的结果如下结构：

```js
_c('div', {id:"app",style:{"color":" red"}},_v("hello"+_s(name)),_c('span', undefined,_v("hello")))
```

通过 `new Function()` 我们将其转为函数

```js
new Function(`${code}`)
```

但是这里有个问题，就是 字符串内部的 `name` 等 `{{xx}}` 里的属性，其 `this`的指向应该是 vm 实例，那么我们使用什么办法能将改变其 `this`的指向呢？答案是使用 `with`语法。

```js
let render = new Function(`with(this){return ${code}}`)
```

此时最终的结果如下：

```js
ƒ anonymous() {
  with(this){return _c('div', {id:"app",style:{"color":" red"}},_v("hello"+_s(name)),_c('span', undefined,_v("hello")))}
}
```

这就得到了我们想要的 render 函数了，将其挂载到 `options` 上

```js
const render = compileToFunctions(template)
options.render = render;
```



### 创建虚拟DOM



将上面的 render 函数最终结果转为虚拟 DOM，在原型对象上定义 `Vue.prototype._render` 方法，执行该方法的结果就是返回一个虚拟dom。该方法的内部就有执行上面的render函数

```js
export function renderMixin(Vue) {

  Vue.prototype._c = function() {   // 创建元素   创建虚拟dom元素
    return createElement(...arguments)
  }

  Vue.prototype._s = function(val) {   // stringify   {{ xx }}
    return val == null ? '' : (typeof val === 'object') ? JSON.stringify(val) : val
  }

  Vue.prototype._v = function(text) {  // 创建文本元素  创建虚拟文本元素
    return createTextVnode(text)
  }

  // 主要就在这个方法上，产生 虚拟 dom，  在执行render函数的时候，会调用_c、_s、_v，然后会得到相应的虚拟dom
  Vue.prototype._render = function() {
    const vm = this

    const render = vm.$options.render

    let vnode = render.call(vm)

    return vnode
  }
}

// _c('div', {}, 1, 2, 3)
function createElement(tag, data={}, ...children) {
  return vnode(tag, data, data.key, children)
}

function createTextVnode(text) {
  return vnode(undefined, undefined, undefined, undefined, text)
}

// 用来产生虚拟dom
function vnode(tag, data, key, children, text) {
  return {
    tag,
    data,
    key,
    children,
    text
  }
}
```

调用 `Vue.prototype._render` 得到的最后结果，虚拟dom 如下:

``` js
{
	children: [
    {tag: undefined, data: undefined, key: undefined, children: undefined, text: "hellozhangsan"},
    {tag: "span", data: {…}, key: undefined, children: Array(1), text: undefined}
  ],
  data: {
    id: "app",
    style: {color: " red"} 
  },
  key: undefined,
  tag: "div",
  text: undefined
}
```



### 渲染真实节点



