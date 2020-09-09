{/* <div id="app"> hello {{name}} <span>hello</span></div> */}

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;

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