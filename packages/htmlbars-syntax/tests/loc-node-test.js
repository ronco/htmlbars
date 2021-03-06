import { parse } from "../htmlbars-syntax";

QUnit.module("[htmlbars-syntax] Parser - Location Info");

function locEqual(node, startLine, startColumn, endLine, endColumn, message) {

  var expected = {
    source: null,
    start: { line: startLine, column: startColumn },
    end: { line: endLine, column: endColumn }
  };

  deepEqual(node.loc, expected, message);
}

test("programs", function() {
  var ast = parse(`
  {{#if foo}}
    {{bar}}
       {{/if}}
    `);

  locEqual(ast, 1, 0, 5, 4, 'outer program');

  // startColumn should be 13 not 2.
  // This should be fixed upstream in Handlebars.
  locEqual(ast.body[1].program, 2, 2, 4, 7, 'nested program');
});

test("blocks", function() {
  var ast = parse(`
  {{#if foo}}
    {{#if bar}}
        test
        {{else}}
      test
  {{/if    }}
       {{/if
      }}
    `);

  let [,block] = ast.body;
  let [nestedBlock] = block.program.body;
  let [nestedBlockText] = nestedBlock.program.body;
  let nestedInverse = nestedBlock.inverse;

  locEqual(block, 2, 2, 9, 8, 'outer block');
  locEqual(nestedBlock, 3, 4, 7, 13, 'nested block');
  locEqual(nestedBlockText, 4, 0, 5, 0);
  locEqual(nestedInverse, 5, 8, 7, 2);
});

test("mustache", function() {
  var ast = parse(`
    {{foo}}
    {{#if foo}}
      bar: {{bar
        }}
    {{/if}}
  `);

  let [,foo,,innerBlock] = ast.body;
  let [barText, bar] = innerBlock.program.body;

  locEqual(foo, 2, 4, 2, 11, 'outer mustache');
  locEqual(barText, 4, 0, 4, 11);
  locEqual(bar, 4, 11, 5, 10, 'inner mustache');
});

test("element modifier", function() {
  var ast = parse(`
    <div {{bind-attr
      foo
      bar=wat}}></div>
  `);

  locEqual(ast.body[1].modifiers[0], 2, 9, 4, 15, 'element modifier');
});

test("html elements", function() {
  var ast = parse(`
    <section>
      <br>
      <div>
        <hr />
      </div>
    </section>
  `);

  let [,section] = ast.body;
  let [,br,,div] = section.children;
  let [,hr] = div.children;

  locEqual(section, 2, 4, 7, 14, 'section element');
  locEqual(br, 3, 6, 3, 10, 'br element');
  locEqual(div, 4, 6, 6, 12, 'div element');
  locEqual(hr, 5, 8, 5, 14, 'hr element');
});

test("html elements with nested blocks", function() {
  var ast = parse(`
    <div>
      {{#if isSingleError}}
        Single error here!
      {{else if errors}}
        Multiple errors here!
      {{else}}
        No errors found!
      {{/if}} <p>Hi there!</p>
    </div>
  `);

  let [,div] = ast.body;
  let [,ifBlock,,p] = div.children;
  let inverseBlock = ifBlock.inverse;
  let [nestedIfBlock] = inverseBlock.body;
  let nestedIfInverseBlock = nestedIfBlock.inverse;

  locEqual(div, 2, 4, 10, 10, 'div element');
  locEqual(ifBlock, 3, 6, 9, 13, 'outer if block');
  locEqual(inverseBlock, 5, 6, 9, 6, 'inverse block');
  locEqual(nestedIfBlock, 5, 6, 9, 6, 'nested if block');
  locEqual(nestedIfInverseBlock, 7, 6, 9, 6, 'nested inverse block');
  locEqual(p, 9, 14, 9, 30, 'p');
});

test("block + newline + element ", function() {
  var ast = parse(`
    {{#if stuff}}
    {{/if}}
    <p>Hi!</p>
  `);

  let [,ifBlock,,p] = ast.body;

  locEqual(ifBlock, 2, 4, 3, 11, 'if block');
  locEqual(p, 4, 4, 4, 14, 'p element');
});

test("mustache + newline + element ", function() {
  var ast = parse(`
    {{foo}}
    <p>Hi!</p>
  `);

  let [,fooMustache,,p] = ast.body;

  locEqual(fooMustache, 2, 4, 2, 11, 'if block');
  locEqual(p, 3, 4, 3, 14, 'p element');
});

test("blocks with nested html elements", function() {
  var ast = parse(`
    {{#foo-bar}}<div>Foo</div>{{/foo-bar}} <p>Hi!</p>
  `);

  let block = ast.body[1].program;
  let [div] = block.body;
  let p = ast.body[3];

  locEqual(p, 2, 43, 2, 53, 'p element');
  locEqual(div, 2, 16, 2, 30, 'div element');
});

test("html elements after mustache", function() {
  var ast = parse(`
    {{foo-bar}} <p>Hi!</p>
  `);

  let [,mustache,,p] = ast.body;

  locEqual(mustache, 2, 4, 2, 15, '{{foo-bar}}');
  locEqual(p, 2, 16, 2, 26, 'div element');
});

test("components", function() {
  var ast = parse(`
    <el-page>
      <el-header></el-header>
      <el-input />
      <el-footer>
          </el-footer>
    </el-page>
  `);

  let [,page] = ast.body;
  let [,header,,input,,footer] = page.program.body;

  locEqual(page, 2, 4, 7, 14, 'page component');
  locEqual(header, 3, 6, 3, 29, 'header component');
  locEqual(input, 4, 6, 4, 18, 'input component');
  locEqual(footer, 5, 6, 6, 22, 'footer component');
});

test("text", function() {
  let ast = parse(`
    foo!
    <div>blah</div>
  `);

  let [fooText,div] = ast.body;
  let [blahText] = div.children;

  locEqual(fooText, 1, 0, 3, 4);
  locEqual(blahText, 3, 9, 3, 13);
});

test("comment", function() {
  let ast = parse(`
    <div><!-- blah blah blah blah --></div>
  `);

  let [,div] = ast.body;
  let [comment] = div.children;

  locEqual(comment, 2, 12, 2, 36);
});

test("element attribute", function() {
  let ast = parse(`
    <div data-foo="blah"
      data-derp="lolol">
      Hi, fivetanley!
    </div>
  `);

  let [,div] = ast.body;
  let [dataFoo, dataDerp] = div.attributes;

  locEqual(dataFoo, 2, 10, 2, 24);
  locEqual(dataDerp, 3, 7, 3, 23);
});
