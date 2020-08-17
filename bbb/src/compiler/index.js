import { generate } from "./generate";

const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 标签名
// ?:匹配不捕获
const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // </my:xx>
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则 捕获的内容是标签名
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的    aaa="aaa"  a='aaa'   a=aaa
const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 >    >   <div></div>  <br/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

/*
<div>hello {{name}} <span>world</span></div>
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
把模板转换成这么一棵树
*/

// 将 html 模板解析成一颗 ast 抽象语法树
function parseHTML(html) {

  function createASTElement(tagName, attrs) {
    return {
      tag: tagName,   // 标签名
      type: 1,        // 元素类型
      children: [],   // 孩子列表
      attrs,          // 属性集合
      parent: null    // 父
    }
  }
  

  let root;
  let currentParent;
  let stack = [];
  //  标签是否符合预期 <div><span></div>  错误的  校验标签是否合法
  // 用一个栈型结构  [div, span]   遇到开始标签 放入栈中， 遇到结束标签 拿出栈中最后一个做比较是否正常
  function start(tagName, attrs) {
    let astElement = createASTElement(tagName, attrs)
    if(!root) {
      root = astElement
    }
    currentParent = astElement;  // 当前解析的标签 保存起来
    stack.push(currentParent)    // 将生产的ast放到栈中
  }
  
  function end(tagName) {   // 在结尾标签处 创建父子关系
    let astElement = stack.pop()   // 去除栈中的最后一个
    currentParent = stack[stack.length-1]
    if(currentParent) {   // 在闭合时可以知道这个标签的父亲是谁
      astElement.parent = currentParent
      currentParent.children.push(astElement)
    } 
  }
  
  function chars(text) {
    text = text.replace(/\s/g, '')
    if(text) {
      currentParent.children.push({
        type: 3,
        text
      })
    }
  }

  while(html){  // 只要 html 不为空字符串就一直解析
    let textEnd = html.indexOf('<');
    // 匹配开始标签
    if(textEnd === 0) {
      // v-bind v-on <!DOCTYPE  ....  等这些都没处理
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
      if(end) {  // >
        advance(end[0].length)
        return match
      }
    }
  }

  return root
}

export function compileToFunctions(template) {
  // html模板 转为 render 函数   html-》render
  /*
    ast 语法树
    1. 需要将html代码转化成 “ast”语法树，可以用ast树来描述语言本身（如描述html、js等）。 
          - 虚拟dom使用对象来描述节点的，但是ast是用来描述语言本身的，所以是不一样的。 一个对语法转义，一个对结构转义

    例如：描述html
      <div id="a"></div>
      {
        attrs: [{id: 'a'}],
        tag: 'div',
        children: []
      }
    例如：也可以描述js 
      const a = 1
      {
        indentifier: const,
        name: a,
        value: 1
      }

    2. 通过这棵树 重新的生成代码   
  */
  let ast = parseHTML(template)

  // 2. 优化静态节点

  // 3. 通过这棵树 重新的生成代码
  let code = generate(ast)
  /*
  <div id="app" style="color: red">hello {{name}} <span>hello</span></div>
  通过 generate 函数 转为 render 函数
  render() {
    return _c('div', {id: 'app', style: {color: 'red'}}, _v('hello'+_s(name)),_c('span', null, _v('hello')))
  }
  */

  // 4. 将字符串变成函数    限制取值范围  通过with来进行取值 稍后调用render函数就可以通过改变this 让这个函数内部取到结果了
  let render = new Function(`with(this){return ${code}}`)
  
  return render 
}

