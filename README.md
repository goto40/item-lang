# item-lang

A custom IDL, a reimplementation of [https://github.com/goto40/mdsd](https://github.com/goto40/mdsd).

This is work-in-progress and my playground to play with [langium](https://langium.org/).

## Plan

 - [X] Migrate raw grammar
 - [X] allow certain keywords (e.g. 'description') as ID in certain cases (e.g. for the name of property definitions): https://blogs.itemis.com/en/xtext-hint-identifiers-conflicting-with-keywords
 - [X] importURI/multi-file, basic demo: https://github.com/langium/langium/discussions/458
 - [ ] importURI/multi-file, restrict lookup to included files: https://github.com/langium/langium/discussions/458
 - [ ] Scoping
   - [X] Simple model elements, like types (FQN based)
   - [X] Complex model relations, like attribute references: `array a: my_int[header.n]`; TODO: also provide path to element!
   - [ ] Discuss direct vs. full modified path references (in the "mixed" case where I syntactically want to allows the user to use both for the same attribute)
   - [ ] Formulas
   - [X] Properties (basic scoping / interactive test only): https://github.com/langium/langium/discussions/401
 - [50%] built-in model (e.g. built-in types and properties): https://github.com/langium/langium/discussions/391
 - [ ] validation
   - [ ] make list of available validation rules here
 - [ ] test framework setup
 - [ ] tests
   - [ ] make a list of available tests in the original python version
 