grammar ItemLanguage

entry Model:
    (imports+=Import)*
    (packages+=Package)*;

Package: 'package' name=ID (packages+=Package|
    ('(' ('property_set' property_set=[PropertySet:FQN])?
        ('.' 'description' '=' description=MYSTRING)?
      ')')?
    (
        (property_sets+=PropertySet|items+=Type|constants+=Constants)+ |
        ('{' (property_sets+=PropertySet|items+=Type|constants+=Constants|packages+=Package)+ '}'))
    );

Struct: 'struct' name=ID ( '(' properties+=Property (',' properties+=Property)* ')' )?
'{'
    (constant_entries+=Constant)*
    (attributes+=Attribute)*
'}';
RawType: 'rawtype' name=ID rawtypetype=RawTypeType bits=MYINT;
Enum: 'enum' name=ID ':' type=[RawType:FQN] ('(' '.' 'description' '=' description=MYSTRING ')')?
'{'
    (enum_entries+=EnumEntry)+
'}';
Type: RawType|Struct|Enum;

Attribute: (if_attr=IfAttribute)? content=AttributeContent;
AttributeContent: ScalarAttribute|ArrayAttribute|VariantAttribute;
VariantAttribute: 'variant' name=ID ':' variant_selector=AttrRef '->' '{' // TODO variant_selector --> only scalarattr allowed!
(mappings+=VariantMapping)+
'}' ( '(' properties+=Property (',' properties+=Property)* ')' )?;
ScalarAttribute: (embedded?='embedded')? 'scalar' name=ID ':' type=[Type:FQN]
    ( '(' properties+=Property (',' properties+=Property)* ')' )?;
ArrayAttribute: (embedded?='embedded')? 'array' name=ID ':' type=[Type:FQN] dims+=Dim
    ( '(' properties+=Property (',' properties+=Property)* ')' )?;
IfAttribute: 'if' predicate=Predicate;

FormulaElement: ScalarAttribute|Constant|EnumEntry;
EnumEntry: 'value' name=ID '=' value=Formula ( '(' properties+=Property (',' properties+=Property)* ')' )?;
Dim: '[' dim=Formula ']';
AttrRef: ref=[FormulaElement:FQN];
VariantMapping: id=Formula ('=' the_name=ID)? ':' type=[Struct:FQN] ( '(' properties+=Property (',' properties+=Property)* ')' )?;

Import: 'import' importURI=MYSTRING;

Predicate: '(' Predicate_Or ')';
Predicate_Or: parts+=Predicate_And ('or' parts+=Predicate_And)*;
Predicate_And: parts+=Predicate_Cmp ('and' parts+=Predicate_Cmp)*;
Predicate_Cmp: part0=Sum (other_parts+=Predicate_CmpPart)+;
Predicate_CmpPart: cmp_op=CmpOp part=Sum;
CmpOp: EQ='=='|NEQ='!='|GT='>'|LT='<'|GE='>='|LE='<=';

Formula: Sum;
Sum: parts+=Dif ('+' parts+=Dif)*;
Dif: parts+=Mul ('-' parts+=Mul)*;
Mul: parts+=Div ('*' parts+=Div)*;
Div: parts+=Val ('/' parts+=Val)*;
Val:
    (valueClassificator=ValueClassificator)?
    (
        value=ExtNumber
        | ref=AttrRef
        | "(" sum=Sum ")"
    );

ValueClassificator: CONST='CONST'|ENUM='ENUM';

PropertySet: 'property_set' name=ID ('extends' extends=[PropertySet:FQN])?
'{'
    (property_definitions+=PropertyDefinition)+
'}';

// Note: times_per_message is only considered for scalar attributes
PropertyDefinition: 'property'
    (optional?='optional')?
    (('applicable' 'for'|'applicable_for') (applicable_for+=ApplicableFor (',' applicable_for+=ApplicableFor)*))?
    name=ID ':'
    internaltype=InternalType
    ('(' '.' 'description' '=' description=MYSTRING ')')?
    ('{' (numberOfPropRestriction=NumberPropertiesPerStructDefRestriction)? '}')?;

NumberPropertiesPerStructDefRestriction: min=MYINT 'to' max=MYINT ('times_per_message'|'times' 'per' 'message');
// Note: "array" is used to disallow "scalars"
// Note: "scalar" is used to disallow "arrays"
ApplicableFor: ApplicableForRawType|'array'|'scalar'|'variant'|'struct_definition'|'enum_value'|'enum'|'struct';
ApplicableForRawType: 'rawtype' ('(' concrete_types+=[RawType:FQN] ("," concrete_types+=[RawType:FQN])* ')')?;
Property: '.' definition=[PropertyDefinition:ID] '=' (
textValue=TextValue |
numberValue=NumberValue
);

Constants: 'constants' name=ID ('(' '.' 'description' '=' description=MYSTRING ')')?
'{'
    (constant_entries+=Constant)+
'}';
Constant: 'constant' name=ID ':' type=[RawType:FQN] '=' value=Formula ('(' '.' 'description' '=' description=MYSTRING ')')?;

TextValue: x=MYSTRING;
NumberValue: x=Formula;

ExtNumber: BoolNumber|NUMBER|HexNumber;

BoolNumber: TRUE='true'|FALSE='false';
RawTypeType: INT='INT'|UINT='UINT'|FLOAT='FLOAT';
InternalType: INT='INT'|UINT='UINT'|FLOAT='FLOAT'|STRING='STRING'|BOOL='BOOL'|ATTRTYPE='ATTRTYPE'|ENUM='ENUM';

NUMBER returns number: STRICTFLOAT|MYINT;
FQN returns string: ID ('.' ID)*;

terminal ID: /[_a-zA-Z][\w_]*/;
terminal MYINT returns number: /[0-9]+/;
terminal HexNumber: /0x[0-9a-fA-F]+/;
terminal STRICTFLOAT returns number: /[+-]?(((\d+\.(\d*)?|\.\d+)([eE][+-]?\d+)?))/; //|((\d+)([eE][+-]?\d+)))(?<=[\w\.])(?![\w\.])/;
terminal MYSTRING returns string: /("(\\"|[^"])*")|('(\\'|[^'])*')/;

hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
