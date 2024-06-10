class CSSOParser {
    constructor(script) {
        this.script = script;
        this.html = '';
        this.css = '';
        this.elements = {};
        this.parentChildMap = {};
        this.parse();
    }

    parse() {
        this.removeComments();
        this.parseDocument();
        this.parseElements();
        this.parseAppend();
        this.parseConditional();
    }

    removeComments() {
        this.script = this.script.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    }

    parseDocument() {
        const docRegex = /\$ = create\.document\(`([^`]+)`\);/;
        const match = this.script.match(docRegex);
        if (match) {
            this.html = match[1];
        }
    }

    parseElements() {
        const elementRegex = /(\w+) = create\.element\("([^"]+)"\);/g;
        let match;
        while ((match = elementRegex.exec(this.script)) !== null) {
            const [_, varName, element] = match;
            this.elements[varName] = element;
        }
    }

    parseAppend() {
        const appendRegex = /\$\((\w+)\)\.append\((\w+), "(\w+)"\);/g;
        let match;
        while ((match = appendRegex.exec(this.script)) !== null) {
            const [_, parentVar, childVar, position] = match;
            const childElement = this.elements[childVar].replace(/<(\w+)/, `<$1 csso-varID="${childVar}"`);
            if (position === "end") {
                this.html = this.html.replace(`</${parentVar}>`, `${childElement}</${parentVar}>`);
            } else if (position === "start") {
                this.html = this.html.replace(`<${parentVar}>`, `<${parentVar}>${childElement}`);
            }
            this.parentChildMap[childVar] = parentVar;
        }
    }

    generateCssSelector(element) {
        let selector = '';
        while (element && this.elements[element]) {
            const tag = this.elements[element].match(/<(\w+)/)[1];
            selector = `${tag}[csso-varID="${element}"]` + (selector ? ' > ' + selector : '');
            element = this.parentChildMap[element];
        }
        return selector;
    }

    parseConditional() {
        const ifCheckedRegex = /if\(\$\(#(\w+)\)\.checked\) \{([^}]+)\};/g;
        let match;
        while ((match = ifCheckedRegex.exec(this.script)) !== null) {
            const [_, id, conditionContent] = match;
            const hideRegex = /hide\((\w+)\);/g;
            let hideMatch;
            while ((hideMatch = hideRegex.exec(conditionContent)) !== null) {
                const varName = hideMatch[1];
                const selector = this.generateCssSelector(varName);
                this.css += `#${id}:checked ~ ${selector} { display: none; }\n`;
            }
        }

        const ifElementCheckedRegex = /if\((\w+)\.checked\) \{([^}]+)\};/g;
        while ((match = ifElementCheckedRegex.exec(this.script)) !== null) {
            const [_, varName, conditionContent] = match;
            const hideRegex = /hide\((\w+)\);/g;
            let hideMatch;
            while ((hideMatch = hideRegex.exec(conditionContent)) !== null) {
                const targetVarName = hideMatch[1];
                const idMatch = this.elements[varName].match(/id='(\w+)'/);
                if (idMatch) {
                    const id = idMatch[1];
                    const selector = this.generateCssSelector(targetVarName);
                    this.css += `#${id}:checked ~ ${selector} { display: none; }\n`;
                }
            }
        }
    }

    getOutput() {
        return { html: this.html, css: this.css };
    }
}

// Example usage
const cssoscript = `
$ = create.document(\`
    <body>
        <input type="checkbox" name="" id="hello">
        <input type="checkbox" name="" id="hi">
        <h1>Hello World</h1>
    </body>
\`);

hi = create.element("<div>hi</div>");
hello = create.element("<div>hello</div>");

test = create.element("<span>Tester</span>");

$(body).append(hi, "end");
$(body).append(hello, "end");
$(h1).append(test, "end");

if($(#hello).checked) {
    hide(hello);
};

if($(#hi).checked) {
    hide(test);
    hide(hi);
};
`;

const parser = new CSSOParser(cssoscript);
const { html, css } = parser.getOutput();
console.log('HTML:');
console.log(html);
console.log('CSS:');
console.log(css);


var _parser = new DOMParser();
var doc = _parser.parseFromString(html, "text/html");

document.body = doc.body;

const cssElm = document.createElement("style");
cssElm.innerText = css;
document.head.appendChild(cssElm);